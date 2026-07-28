#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2012-2019 mutschler, jkrehm, cervinko, janeczku, OzzieIsaacs, csitko
#                            ok11, issmirnov, idalin
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program. If not, see <http://www.gnu.org/licenses/>.

import atexit
import itertools
import os
import sys
import uuid
from binascii import hexlify
from datetime import UTC, datetime, timedelta

from flask import session as flask_session

from .cw_login import AnonymousUserMixin, current_user, user_logged_in

try:
    from flask_dance.consumer.backend.sqla import OAuthConsumerMixin  # pyright: ignore[reportMissingImports]

    oauth_support = True
except ImportError:
    # fails on flask-dance >1.3, due to renaming
    try:
        from flask_dance.consumer.storage.sqla import OAuthConsumerMixin  # pyright: ignore[reportMissingImports]

        oauth_support = True
    except ImportError:
        OAuthConsumerMixin = BaseException
        oauth_support = False
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    create_engine,
    event,
    exc,
    exists,
    inspect,
    text,
)
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.sql.expression import func

try:
    # Compatibility with sqlalchemy 2.0
    from sqlalchemy.orm import declarative_base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, backref, relationship, scoped_session, sessionmaker
from werkzeug.security import generate_password_hash

from . import constants, logger
from .string_helper import strip_whitespaces

log = logger.create()

import contextlib  # noqa: E402
from typing import TYPE_CHECKING  # noqa: E402

if TYPE_CHECKING:
    from sqlalchemy.orm import Session as _SASession

    session: _SASession
    app_DB_path: str
else:
    # `session` is None at module import time and assigned in init_db() at
    # app startup. The annotation above (when type-checking) gives pyright
    # the proper Session type so `ub.session.query(...)` etc. are checked.
    session = None  # type: ignore[assignment]
    app_DB_path = None  # type: ignore[assignment]

Base = declarative_base()
searched_ids: dict = {}  # pyright: ignore[reportMissingTypeArgument]

logged_in: dict = {}  # pyright: ignore[reportMissingTypeArgument]


def signal_store_user_session(object, user):
    store_user_session()


def store_user_session():
    _user = flask_session.get("_user_id", "")
    _id = flask_session.get("_id", "")
    _random = flask_session.get("_random", "")
    if flask_session.get("_user_id", ""):
        try:
            if not check_user_session(_user, _id, _random):
                expiry = int((datetime.now() + timedelta(days=31)).timestamp())
                user_session = User_Sessions(_user, _id, _random, expiry)
                session.add(user_session)
                session.commit()
                log.debug("Login and store session : " + _id)
            else:
                log.debug("Found stored session: " + _id)
        except (exc.OperationalError, exc.InvalidRequestError) as e:
            session.rollback()
            log.exception(e)
    else:
        log.error("No user id in session")


def delete_user_session(user_id, session_key):
    try:
        log.debug("Deleted session_key: " + session_key)
        session.query(User_Sessions).filter(
            User_Sessions.user_id == user_id,  # pyright: ignore[reportGeneralTypeIssues]
            User_Sessions.session_key == session_key,
        ).delete()  # pyright: ignore[reportGeneralTypeIssues]
        session.commit()
    except (exc.OperationalError, exc.InvalidRequestError) as ex:
        session.rollback()
        log.exception(ex)


def check_user_session(user_id, session_key, random):
    try:
        found = (
            session.query(User_Sessions)
            .filter(
                User_Sessions.user_id == user_id,  # pyright: ignore[reportGeneralTypeIssues]
                User_Sessions.session_key == session_key,  # pyright: ignore[reportGeneralTypeIssues]
                User_Sessions.random == random,  # pyright: ignore[reportGeneralTypeIssues]
            )
            .one_or_none()
        )
        if found is not None:
            new_expiry = int((datetime.now() + timedelta(days=31)).timestamp())
            if new_expiry - found.expiry > 86400:  # pyright: ignore[reportGeneralTypeIssues]
                found.expiry = new_expiry
                session.merge(found)
                session.commit()
        return bool(found)
    except (exc.OperationalError, exc.InvalidRequestError) as e:
        session.rollback()
        log.exception(e)
        return False


user_logged_in.connect(signal_store_user_session)


def store_ids(result):
    ids = []
    for element in result:
        ids.append(element.id)
    searched_ids[current_user.id] = ids


def store_combo_ids(result):
    ids = []
    for element in result:
        ids.append(element[0].id)
    searched_ids[current_user.id] = ids


class UserBase:
    # Class-level type annotation so pyright can verify access on UserBase
    # instances. The actual column is declared on the User model below.
    view_settings: dict  # pyright: ignore[reportUninitializedInstanceVariable,reportMissingTypeArgument]
    role: int  # pyright: ignore[reportUninitializedInstanceVariable]
    allowed_tags: str  # pyright: ignore[reportUninitializedInstanceVariable]
    denied_tags: str  # pyright: ignore[reportUninitializedInstanceVariable]
    allowed_column_value: str  # pyright: ignore[reportUninitializedInstanceVariable]
    denied_column_value: str  # pyright: ignore[reportUninitializedInstanceVariable]

    @property
    def is_authenticated(self):
        return self.is_active

    def _has_role(self, role_flag):
        return constants.has_flag(self.role, role_flag)

    def role_admin(self):
        return self._has_role(constants.ROLE_ADMIN)

    def role_download(self):
        return self._has_role(constants.ROLE_DOWNLOAD)

    def role_upload(self):
        return self._has_role(constants.ROLE_UPLOAD)

    def role_edit(self):
        return self._has_role(constants.ROLE_EDIT)

    def role_passwd(self):
        return self._has_role(constants.ROLE_PASSWD)

    def role_anonymous(self):
        return self._has_role(constants.ROLE_ANONYMOUS)

    def role_edit_shelfs(self):
        return self._has_role(constants.ROLE_EDIT_SHELFS)

    def role_delete_books(self):
        return self._has_role(constants.ROLE_DELETE_BOOKS)

    def role_viewer(self):
        return self._has_role(constants.ROLE_VIEWER)

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return self.role_anonymous()

    def get_id(self):
        return str(self.id)  # pyright: ignore[reportAttributeAccessIssue]

    def filter_language(self):
        return self.default_language  # pyright: ignore[reportAttributeAccessIssue]

    def check_visibility(self, value):
        if value == constants.SIDEBAR_RECENT:
            return True
        return constants.has_flag(self.sidebar_view, value)  # pyright: ignore[reportAttributeAccessIssue]

    def show_detail_random(self):
        return self.check_visibility(constants.DETAIL_RANDOM)

    def list_denied_tags(self):
        mct = self.denied_tags or ""
        return [strip_whitespaces(t) for t in mct.split(",")]

    def list_allowed_tags(self):
        mct = self.allowed_tags or ""
        return [strip_whitespaces(t) for t in mct.split(",")]

    def list_denied_column_values(self):
        mct = self.denied_column_value or ""
        return [strip_whitespaces(t) for t in mct.split(",")]

    def list_allowed_column_values(self):
        mct = self.allowed_column_value or ""
        return [strip_whitespaces(t) for t in mct.split(",")]

    def get_view_property(self, page, prop):
        if not self.view_settings.get(page):
            return None
        return self.view_settings[page].get(prop)

    def set_view_property(self, page, prop, value):
        if not self.view_settings.get(page):
            self.view_settings[page] = {}
        self.view_settings[page][prop] = value
        with contextlib.suppress(AttributeError):
            flag_modified(self, "view_settings")
        try:
            session.commit()
        except (exc.OperationalError, exc.InvalidRequestError) as e:
            session.rollback()
            log.error_or_exception(e)

    def __repr__(self):
        return f"<User {self.name!r}>"  # pyright: ignore[reportAttributeAccessIssue]


# Baseclass for Users in Calibre-Web, settings which depend on certain users are stored here. It is derived from
# User Base (all access methods are declared there)
class User(UserBase, Base):
    __tablename__ = "user"
    __table_args__ = {"sqlite_autoincrement": True}

    id: int = Column(Integer, primary_key=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    name: str = Column(String(64), unique=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    email: str = Column(String(120), unique=True, default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    role: int = Column(SmallInteger, default=constants.ROLE_USER)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    password: str = Column(String)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    kindle_mail: str = Column(String(120), default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    shelf = relationship("Shelf", backref="user", lazy="dynamic", order_by="Shelf.name")
    downloads = relationship("Downloads", backref="user", lazy="dynamic")
    locale: str = Column(String(2), default="en")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    sidebar_view: int = Column(Integer, default=1)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    default_language: str = Column(String(3), default="all")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    denied_tags: str = Column(String, default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    allowed_tags: str = Column(String, default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    denied_column_value: str = Column(String, default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    allowed_column_value: str = Column(String, default="")  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    remote_auth_token = relationship("RemoteAuthToken", backref="user", lazy="dynamic")
    view_settings: dict = Column(JSON, default={})  # type: ignore[assignment] # pyright: ignore[reportAssignmentType,reportMissingTypeArgument]
    kobo_only_shelves_sync: int = Column(Integer, default=0)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]


if oauth_support:

    class OAuth(OAuthConsumerMixin, Base):  # pyright: ignore[reportGeneralTypeIssues]
        provider_user_id = Column(String(256))
        user_id = Column(Integer, ForeignKey(User.id))  # pyright: ignore[reportArgumentType]
        user = relationship(User)


class OAuthProvider(Base):
    __tablename__ = "oauthProvider"

    id = Column(Integer, primary_key=True)
    provider_name = Column(String)
    oauth_client_id = Column(String)
    oauth_client_secret = Column(String)
    active = Column(Boolean)


# Class for anonymous user is derived from User base and completely overrides methods and properties for the
# anonymous user
class Anonymous(AnonymousUserMixin, UserBase):  # pyright: ignore[reportIncompatibleMethodOverride]
    def __init__(self):
        self.kobo_only_shelves_sync = None
        self.view_settings = None  # pyright: ignore[reportAttributeAccessIssue]
        self.allowed_column_value = None  # pyright: ignore[reportAttributeAccessIssue]
        self.allowed_tags = None  # pyright: ignore[reportAttributeAccessIssue]
        self.denied_tags = None  # pyright: ignore[reportAttributeAccessIssue]
        self.kindle_mail = None
        self.locale = None
        self.default_language = None
        self.sidebar_view = None
        self.id = None
        self.role = None  # pyright: ignore[reportAttributeAccessIssue]
        self.name = None
        self.loadSettings()

    def loadSettings(self):
        data = (
            session.query(User)
            .filter(User.role.op("&")(constants.ROLE_ANONYMOUS) == constants.ROLE_ANONYMOUS)  # pyright: ignore[reportAttributeAccessIssue]
            .first()
        )  # type: User
        self.name = data.name  # pyright: ignore[reportOptionalMemberAccess]
        self.role = data.role  # pyright: ignore[reportOptionalMemberAccess]
        self.id = data.id  # pyright: ignore[reportOptionalMemberAccess]
        self.sidebar_view = data.sidebar_view  # pyright: ignore[reportOptionalMemberAccess]
        self.default_language = data.default_language  # pyright: ignore[reportOptionalMemberAccess]
        self.locale = data.locale  # pyright: ignore[reportOptionalMemberAccess]
        self.kindle_mail = data.kindle_mail  # pyright: ignore[reportOptionalMemberAccess]
        self.denied_tags = data.denied_tags  # pyright: ignore[reportOptionalMemberAccess]
        self.allowed_tags = data.allowed_tags  # pyright: ignore[reportOptionalMemberAccess]
        self.denied_column_value = data.denied_column_value  # pyright: ignore[reportOptionalMemberAccess]
        self.allowed_column_value = data.allowed_column_value  # pyright: ignore[reportOptionalMemberAccess]
        self.view_settings = data.view_settings  # pyright: ignore[reportOptionalMemberAccess]
        self.kobo_only_shelves_sync = data.kobo_only_shelves_sync  # pyright: ignore[reportOptionalMemberAccess]

    def role_admin(self):
        return False

    @property
    def is_active(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return False

    @property
    def is_anonymous(self):
        return True

    @property
    def is_authenticated(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return False

    def get_view_property(self, page, prop):
        if "view" in flask_session:
            if not flask_session["view"].get(page):
                return None
            return flask_session["view"][page].get(prop)
        return None

    def set_view_property(self, page, prop, value):
        if "view" not in flask_session:
            flask_session["view"] = {}
        if not flask_session["view"].get(page):
            flask_session["view"][page] = {}
        flask_session["view"][page][prop] = value


class User_Sessions(Base):
    __tablename__ = "user_session"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    session_key = Column(String, default="")
    random = Column(String, default="")
    expiry = Column(Integer)

    def __init__(self, user_id, session_key, random, expiry):
        super().__init__()
        self.user_id = user_id
        self.session_key = session_key
        self.random = random
        self.expiry = expiry


# Baseclass representing Shelfs in calibre-web in app.db
class Shelf(Base):
    __tablename__ = "shelf"

    id = Column(Integer, primary_key=True)
    uuid = Column(String, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    is_public = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("user.id"))
    kobo_sync = Column(Boolean, default=False)
    books = relationship("BookShelf", backref="ub_shelf", cascade="all, delete-orphan", lazy="dynamic")
    created = Column(DateTime, default=lambda: datetime.now(UTC))
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    def __repr__(self):
        return f"<Shelf {self.id}:{self.name!r}>"


# Baseclass representing Relationship between books and Shelfs in Calibre-Web in app.db (N:M)
class BookShelf(Base):
    __tablename__ = "book_shelf_link"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer)
    order = Column(Integer)
    shelf = Column(Integer, ForeignKey("shelf.id"))
    date_added = Column(DateTime, default=lambda: datetime.now(UTC))

    def __repr__(self):
        return f"<Book {self.id!r}>"


# This table keeps track of deleted Shelves so that deletes can be propagated to any paired Kobo device.
class ShelfArchive(Base):
    __tablename__ = "shelf_archive"

    id = Column(Integer, primary_key=True)
    uuid = Column(String)
    user_id = Column(Integer, ForeignKey("user.id"))
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC))


class ReadBook(Base):
    __tablename__ = "book_read_link"

    STATUS_UNREAD = 0
    STATUS_FINISHED = 1
    STATUS_IN_PROGRESS = 2

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, unique=False)
    user_id = Column(Integer, ForeignKey("user.id"), unique=False)
    read_status = Column(Integer, unique=False, default=STATUS_UNREAD, nullable=False)
    kobo_reading_state = relationship(
        "KoboReadingState",
        uselist=False,
        primaryjoin="and_(ReadBook.user_id == foreign(KoboReadingState.user_id), "
        "ReadBook.book_id == foreign(KoboReadingState.book_id))",
        cascade="all",
        backref=backref("book_read_link", uselist=False),
    )
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    last_time_started_reading = Column(DateTime, nullable=True)
    times_started_reading = Column(Integer, default=0, nullable=False)


class Bookmark(Base):
    __tablename__ = "bookmark"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    book_id = Column(Integer)
    format = Column(String(collation="NOCASE"))
    bookmark_key = Column(String)


# Baseclass representing books that are archived on the user's Kobo device.
class ArchivedBook(Base):
    __tablename__ = "archived_book"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    book_id = Column(Integer)
    is_archived = Column(Boolean, unique=False)
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC))


class KoboSyncedBooks(Base):
    __tablename__ = "kobo_synced_books"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    book_id = Column(Integer)


# The Kobo ReadingState API keeps track of 4 timestamped entities:
#   ReadingState, StatusInfo, Statistics, CurrentBookmark
# Which we map to the following 4 tables:
#   KoboReadingState, ReadBook, KoboStatistics and KoboBookmark
class KoboReadingState(Base):
    __tablename__ = "kobo_reading_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    book_id = Column(Integer)
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    priority_timestamp = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    current_bookmark = relationship("KoboBookmark", uselist=False, backref="kobo_reading_state", cascade="all, delete")
    statistics = relationship("KoboStatistics", uselist=False, backref="kobo_reading_state", cascade="all, delete")


class KoboBookmark(Base):
    __tablename__ = "kobo_bookmark"

    id = Column(Integer, primary_key=True)
    kobo_reading_state_id = Column(Integer, ForeignKey("kobo_reading_state.id"))
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    location_source = Column(String)
    location_type = Column(String)
    location_value = Column(String)
    progress_percent = Column(Float)
    content_source_progress_percent = Column(Float)


class KoboStatistics(Base):
    __tablename__ = "kobo_statistics"

    id = Column(Integer, primary_key=True)
    kobo_reading_state_id = Column(Integer, ForeignKey("kobo_reading_state.id"))
    last_modified = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    remaining_time_minutes = Column(Integer)
    spent_reading_minutes = Column(Integer)


# Updates the last_modified timestamp in the KoboReadingState table if any of its children tables are modified.
@event.listens_for(Session, "before_flush")
def receive_before_flush(session, flush_context, instances):
    for change in itertools.chain(session.new, session.dirty):
        if isinstance(change, (ReadBook, KoboStatistics, KoboBookmark)) and change.kobo_reading_state:
            change.kobo_reading_state.last_modified = datetime.now(UTC)
    # Maintain the last_modified_bit for the Shelf table.
    for change in itertools.chain(session.new, session.deleted):
        if isinstance(change, BookShelf):
            change.ub_shelf.last_modified = datetime.now(UTC)


# Baseclass representing Downloads from calibre-web in app.db
class Downloads(Base):
    __tablename__ = "downloads"

    id: int = Column(Integer, primary_key=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    book_id: int = Column(Integer)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    user_id: int = Column(Integer, ForeignKey("user.id"))  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]

    def __repr__(self):
        return f"<Download {self.book_id!r}"


# Baseclass representing audit log entries for user actions
class AuditLog(Base):
    __tablename__ = "audit_log"

    id: int = Column(Integer, primary_key=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    user_id: int = Column(Integer, ForeignKey("user.id"), nullable=False)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    action: str = Column(String(64), nullable=False)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    resource_type: str = Column(String(64), nullable=False)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    resource_id: str = Column(String(128), nullable=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    details: str = Column(String(4096), nullable=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    ip_address: str = Column(String(45), nullable=True)  # type: ignore[assignment] # pyright: ignore[reportAssignmentType]
    created = Column(DateTime, default=lambda: datetime.now(UTC))

    user = relationship("User", foreign_keys=[user_id])  # pyright: ignore[reportArgumentType]

    def __repr__(self):
        return f"<AuditLog {self.user_id!r} {self.action!r} {self.resource_type!r}>"


# Baseclass representing allowed domains for registration
class Registration(Base):
    __tablename__ = "registration"

    id = Column(Integer, primary_key=True)
    domain = Column(String)
    allow = Column(Integer)

    def __repr__(self):
        return f"<Registration('{self.domain}')>"


class RemoteAuthToken(Base):
    __tablename__ = "remote_auth_token"

    id = Column(Integer, primary_key=True)
    auth_token = Column(String, unique=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    verified = Column(Boolean, default=False)
    expiration = Column(DateTime)
    token_type = Column(Integer, default=0)

    def __init__(self):
        super().__init__()
        self.auth_token = (hexlify(os.urandom(16))).decode("utf-8")
        self.expiration = datetime.now() + timedelta(minutes=10)  # 10 min from now

    def __repr__(self):
        return f"<Token {self.id!r}>"


def filename(context):
    file_format = context.get_current_parameters()["format"]
    if file_format == "jpeg":
        return context.get_current_parameters()["uuid"] + ".jpg"
    else:
        return context.get_current_parameters()["uuid"] + "." + file_format


class Thumbnail(Base):
    __tablename__ = "thumbnail"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer)
    uuid = Column(String, default=lambda: str(uuid.uuid4()), unique=True)
    format = Column(String, default="jpeg")
    type = Column(SmallInteger, default=constants.THUMBNAIL_TYPE_COVER)
    resolution = Column(SmallInteger, default=constants.COVER_THUMBNAIL_SMALL)
    filename = Column(String, default=filename)
    generated_at = Column(DateTime, default=lambda: datetime.now(UTC))
    expiration = Column(DateTime, nullable=True)


# Add missing tables during migration of database
def add_missing_tables(engine, _session):
    if not engine.dialect.has_table(engine.connect(), "archived_book"):
        ArchivedBook.__table__.create(bind=engine)
    if not engine.dialect.has_table(engine.connect(), "thumbnail"):
        Thumbnail.__table__.create(bind=engine)


# migrate all settings missing in registration table
def migrate_registration_table(engine, _session):
    try:
        # Handle table exists, but no content
        cnt = _session.query(Registration).count()
        if not cnt:
            with engine.connect() as conn:
                trans = conn.begin()
                conn.execute(text("insert into registration (domain, allow) values('%.%',1)"))
                trans.commit()
    except exc.OperationalError:  # Database is not writeable
        sys.exit(2)


def migrate_user_session_table(engine, _session):
    try:
        _session.query(exists().where(User_Sessions.random)).scalar()  # pyright: ignore[reportArgumentType,reportGeneralTypeIssues]
        _session.commit()
    except exc.OperationalError:  # Database is not compatible, some columns are missing
        with engine.connect() as conn:
            trans = conn.begin()
            conn.execute(text("ALTER TABLE user_session ADD column 'random' String"))
            conn.execute(text("ALTER TABLE user_session ADD column 'expiry' Integer"))
            trans.commit()


# Migrate database to current version, has to be updated after every database change. Currently, migration from
# maybe 4/5 versions back to current should work.
# Migration is done by checking if relevant columns are existing, and then adding rows with SQL commands
def migrate_Database(_session):
    engine = _session.bind
    add_missing_tables(engine, _session)
    migrate_registration_table(engine, _session)
    migrate_user_session_table(engine, _session)


def _ensure_column(engine, table_name, column_name, column_def):
    """Idempotent SQLite ALTER TABLE for new columns."""
    try:
        insp = inspect(engine)
        cols = {c["name"] for c in insp.get_columns(table_name)}
        if column_name in cols:
            return
        with engine.begin() as conn:
            conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")
    except Exception:
        # never block startup on migration
        import traceback

        traceback.print_exc()


def clean_database(_session):
    # Remove expired remote login tokens
    now = datetime.now()
    try:
        _session.query(RemoteAuthToken).filter(now > RemoteAuthToken.expiration).filter(
            RemoteAuthToken.token_type != 1
        ).delete()
        _session.commit()
    except exc.OperationalError:  # Database is not writeable
        sys.exit(2)


# Save downloaded books per user in calibre-web's own database
def update_download(book_id, user_id):
    check = session.query(Downloads).filter(Downloads.user_id == user_id).filter(Downloads.book_id == book_id).first()

    if not check:
        new_download = Downloads(user_id=user_id, book_id=book_id)
        session.add(new_download)
        try:
            session.commit()
        except exc.OperationalError:
            session.rollback()


# Delete non-existing downloaded books in calibre-web's own database
def delete_download(book_id):
    session.query(Downloads).filter(book_id == Downloads.book_id).delete()
    try:
        session.commit()
    except exc.OperationalError:
        session.rollback()


# Create an audit log entry
def create_audit_log_entry(user_id, action, resource_type, resource_id=None, details=None, ip_address=None):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        details=details,
        ip_address=ip_address,
    )
    session.add(entry)
    try:
        session.commit()
    except exc.OperationalError:
        session.rollback()


# Generate user Guest (translated text), as anonymous user, no rights
def create_anonymous_user(_session):
    user = User()
    user.name = "Guest"
    user.email = "no@email"
    user.role = constants.ROLE_ANONYMOUS
    user.password = ""

    _session.add(user)
    try:
        _session.commit()
    except Exception:
        _session.rollback()


# Generate User admin with admin123 password, and access to everything
def create_admin_user(_session):
    user = User()
    user.name = "admin"
    user.email = "admin@example.org"
    user.role = constants.ADMIN_USER_ROLES
    user.sidebar_view = constants.ADMIN_USER_SIDEBAR

    user.password = generate_password_hash(constants.DEFAULT_PASSWORD)

    _session.add(user)
    try:
        _session.commit()
    except Exception:
        _session.rollback()


def init_db_thread():
    global app_DB_path
    engine = create_engine(f"sqlite:///{app_DB_path}", echo=False)

    Session = scoped_session(sessionmaker())
    Session.configure(bind=engine)
    return Session()


def init_db(app_db_path):
    # Open session for database connection
    global session
    global app_DB_path

    app_DB_path = app_db_path
    engine = create_engine(f"sqlite:///{app_db_path}", echo=False)

    Session = scoped_session(sessionmaker())
    Session.configure(bind=engine)
    session = Session()

    if os.path.exists(app_db_path):
        Base.metadata.create_all(engine)
        _ensure_column(engine, "settings", "config_frontend_rebuild_token", "VARCHAR DEFAULT ''")
        migrate_Database(session)
        clean_database(session)
    else:
        Base.metadata.create_all(engine)
        create_admin_user(session)
        create_anonymous_user(session)


def password_change(user_credentials=None):
    if user_credentials:
        username, password = user_credentials.split(":", 1)
        user = session.query(User).filter(func.lower(User.name) == username.lower()).first()
        if user:
            if not password:
                sys.exit(4)
            try:
                from .helper import valid_password

                user.password = generate_password_hash(valid_password(password))
            except Exception:
                sys.exit(4)
            if session_commit() == "":
                sys.exit(0)
            else:
                sys.exit(3)
        else:
            sys.exit(3)


def get_new_session_instance():
    new_engine = create_engine(f"sqlite:///{app_DB_path}", echo=False)
    new_session = scoped_session(sessionmaker())
    new_session.configure(bind=new_engine)

    atexit.register(lambda: new_session.remove() if new_session else True)

    return new_session


def dispose():
    global session

    old_session = session
    session = None  # pyright: ignore[reportAssignmentType]
    if old_session:
        with contextlib.suppress(Exception):
            old_session.close()
        if old_session.bind:
            with contextlib.suppress(Exception):
                old_session.bind.dispose()  # pyright: ignore[reportAttributeAccessIssue]


def session_commit(success=None, _session=None):
    s = _session or session
    try:
        s.commit()
        if success:
            log.info(success)
    except (exc.OperationalError, exc.InvalidRequestError) as e:
        s.rollback()
        log.error_or_exception(e)
    return ""
