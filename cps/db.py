#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2012-2019 mutschler, cervinko, ok11, jkrehm, nanu-c, Wineliva,
#                            pjeby, elelay, idalin, Ozzieisaacs
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

import json
import os
import re
import time
from datetime import UTC, datetime
from sqlite3 import OperationalError as sqliteOperationalError
from urllib.parse import quote

# from weakref import WeakSet
from uuid import uuid4

import unidecode
from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    CheckConstraint,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    create_engine,
)
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.orm import relationship, scoped_session, selectinload, sessionmaker
from sqlalchemy.orm.collections import InstrumentedList

try:
    # Compatibility with sqlalchemy 2.0
    from sqlalchemy.orm import declarative_base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
import contextlib

from flask import Flask, flash, g
from flask_babel import get_locale
from flask_babel import gettext as _
from sqlalchemy import event
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql.expression import and_, false, func, or_, text, true

from . import isoLanguages, logger, ub
from .cw_login import current_user
from .pagination import Pagination
from .string_helper import strip_whitespaces

log = logger.create()

cc_exceptions = ["composite", "series"]
cc_classes = {}
LIST_RELATIONSHIPS = {
    "index": ("authors", "series", "ratings", "data"),
    "author": ("authors", "series", "ratings", "data"),
    "feed": ("authors", "tags", "series", "publishers", "ratings", "languages"),
    "basic": ("authors",),
    "shelf": ("authors", "series", "ratings"),
    "shelf_download": ("authors", "series", "data"),
    "ajax": ("authors", "tags", "series", "publishers", "ratings", "languages", "data"),
}

Base = declarative_base()

books_authors_link = Table(
    "books_authors_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("author", Integer, ForeignKey("authors.id"), primary_key=True),
)

books_tags_link = Table(
    "books_tags_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("tag", Integer, ForeignKey("tags.id"), primary_key=True),
)

books_series_link = Table(
    "books_series_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("series", Integer, ForeignKey("series.id"), primary_key=True),
)

books_ratings_link = Table(
    "books_ratings_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("rating", Integer, ForeignKey("ratings.id"), primary_key=True),
)

books_languages_link = Table(
    "books_languages_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("lang_code", Integer, ForeignKey("languages.id"), primary_key=True),
)

books_publishers_link = Table(
    "books_publishers_link",
    Base.metadata,
    Column("book", Integer, ForeignKey("books.id"), primary_key=True),
    Column("publisher", Integer, ForeignKey("publishers.id"), primary_key=True),
)


class Library_Id(Base):
    __tablename__ = "library_id"
    id = Column(Integer, primary_key=True)
    uuid = Column(String, nullable=False)


class Identifiers(Base):
    __tablename__ = "identifiers"

    id = Column(Integer, primary_key=True)
    type = Column(String(collation="NOCASE"), nullable=False, default="isbn")
    val = Column(String(collation="NOCASE"), nullable=False)
    book = Column(Integer, ForeignKey("books.id"), nullable=False)
    amazon = {
        "jp": "co.jp",
        "uk": "co.uk",
        "us": "com",
        "au": "com.au",
        "be": "com.be",
        "br": "com.br",
        "tr": "com.tr",
        "mx": "com.mx",
    }

    def __init__(self, val, id_type, book):
        super().__init__()
        self.val = val
        self.type = id_type
        self.book = book

    def format_type(self):
        format_type = self.type.lower()
        if format_type == "amazon":
            return "Amazon"
        elif format_type.startswith("amazon_"):
            label_amazon = "Amazon.{0}"
            country_code = format_type[7:].lower()
            if country_code not in self.amazon:
                return label_amazon.format(country_code)
            return label_amazon.format(self.amazon[country_code])
        elif format_type == "isbn":
            return "ISBN"
        elif format_type == "doi":
            return "DOI"
        elif format_type == "douban":
            return "Douban"
        elif format_type == "goodreads":
            return "Goodreads"
        elif format_type == "babelio":
            return "Babelio"
        elif format_type == "google":
            return "Google Books"
        elif format_type == "kobo":
            return "Kobo"
        elif format_type == "barnesnoble":
            return "Barnes & Noble"
        elif format_type == "litres":
            return "ЛитРес"
        elif format_type == "issn":
            return "ISSN"
        elif format_type == "isfdb":
            return "ISFDB"
        elif format_type == "storygraph":
            return "StoryGraph"
        elif format_type == "ebooks":
            return "eBooks.com"
        elif format_type == "smashwords":
            return "Smashwords"
        if format_type == "lubimyczytac":
            return "Lubimyczytac"
        if format_type == "databazeknih":
            return "Databáze knih"
        else:
            return self.type

    def __repr__(self):
        format_type = self.type.lower()
        if format_type == "amazon" or format_type == "asin":
            return f"https://amazon.com/dp/{self.val}"
        elif format_type.startswith("amazon_"):
            link_amazon = "https://amazon.{0}/dp/{1}"
            country_code = format_type[7:].lower()
            if country_code not in self.amazon:
                return link_amazon.format(country_code, self.val)
            return link_amazon.format(self.amazon[country_code], self.val)
        elif format_type == "isbn":
            return f"https://www.worldcat.org/isbn/{self.val}"
        elif format_type == "doi":
            return f"https://dx.doi.org/{self.val}"
        elif format_type == "goodreads":
            return f"https://www.goodreads.com/book/show/{self.val}"
        elif format_type == "babelio":
            return f"https://www.babelio.com/livres/titre/{self.val}"
        elif format_type == "douban":
            return f"https://book.douban.com/subject/{self.val}"
        elif format_type == "google":
            return f"https://books.google.com/books?id={self.val}"
        elif format_type == "kobo":
            return f"https://www.kobo.com/ebook/{self.val}"
        elif format_type == "barnesnoble":
            return f"https://www.barnesandnoble.com/w/{self.val}"
        elif format_type == "lubimyczytac":
            return f"https://lubimyczytac.pl/ksiazka/{self.val}/ksiazka"
        elif format_type == "litres":
            return f"https://www.litres.ru/{self.val}"
        elif format_type == "issn":
            return f"https://portal.issn.org/resource/ISSN/{self.val}"
        elif format_type == "isfdb":
            return f"https://www.isfdb.org/cgi-bin/pl.cgi?{self.val}"
        elif format_type == "databazeknih":
            return f"https://www.databazeknih.cz/knihy/{self.val}"
        elif format_type == "storygraph":
            return f"https://app.thestorygraph.com/books/{self.val}"
        elif format_type == "ebooks":
            return f"https://www.ebooks.com/en-us/book/{self.val}"
        elif format_type == "smashwords":
            return f"https://www.smashwords.com/books/view/{self.val}"
        elif self.val.lower().startswith("javascript:"):
            return quote(self.val)  # pyright: ignore[reportCallIssue,reportArgumentType]
        elif self.val.lower().startswith("data:"):
            link, __, __ = str.partition(self.val, ",")  # pyright: ignore[reportArgumentType]
            return link
        else:
            return f"{self.val}"


class Comments(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    book = Column(Integer, ForeignKey("books.id"), nullable=False, unique=True)
    text = Column(String(collation="NOCASE"), nullable=False)

    def __init__(self, comment, book):
        super().__init__()
        self.text = comment
        self.book = book

    def get(self):
        return self.text

    def __repr__(self):
        return f"<Comments({self.text})>"


class Tags(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(collation="NOCASE"), unique=True, nullable=False)

    def __init__(self, name):
        super().__init__()
        self.name = name

    def get(self):
        return self.name

    def __eq__(self, other):
        return self.name == other

    def __repr__(self):
        return f"<Tags('{self.name})>"


class Authors(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True)
    name = Column(String(collation="NOCASE"), unique=True, nullable=False)
    sort = Column(String(collation="NOCASE"))
    link = Column(String, nullable=False, default="")

    def __init__(self, name, sort, link=""):
        super().__init__()
        self.name = name
        self.sort = sort
        self.link = link

    def get(self):
        return self.name

    def __eq__(self, other):
        return self.name == other

    def __repr__(self):
        return f"<Authors('{self.name},{self.sort}{self.link}')>"


class Series(Base):
    __tablename__ = "series"

    id = Column(Integer, primary_key=True)
    name = Column(String(collation="NOCASE"), unique=True, nullable=False)
    sort = Column(String(collation="NOCASE"))

    def __init__(self, name, sort):
        super().__init__()
        self.name = name
        self.sort = sort

    def get(self):
        return self.name

    def __eq__(self, other):
        return self.name == other

    def __repr__(self):
        return f"<Series('{self.name},{self.sort}')>"


class Ratings(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True)
    rating = Column(Integer, CheckConstraint("rating>-1 AND rating<11"), unique=True)

    def __init__(self, rating):
        super().__init__()
        self.rating = rating

    def get(self):
        return self.rating

    def __eq__(self, other):
        return self.rating == other

    def __repr__(self):
        return f"<Ratings('{self.rating}')>"


class Languages(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True)
    lang_code = Column(String(collation="NOCASE"), nullable=False, unique=True)

    def __init__(self, lang_code):
        super().__init__()
        self.lang_code = lang_code

    def get(self):
        if hasattr(self, "language_name"):
            return self.language_name
        else:
            return self.lang_code

    def __eq__(self, other):
        return self.lang_code == other

    def __repr__(self):
        return f"<Languages('{self.lang_code}')>"


class Publishers(Base):
    __tablename__ = "publishers"

    id = Column(Integer, primary_key=True)
    name = Column(String(collation="NOCASE"), nullable=False, unique=True)
    sort = Column(String(collation="NOCASE"))

    def __init__(self, name, sort):
        super().__init__()
        self.name = name
        self.sort = sort

    def get(self):
        return self.name

    def __eq__(self, other):
        return self.name == other

    def __repr__(self):
        return f"<Publishers('{self.name},{self.sort}')>"


class Data(Base):
    __tablename__ = "data"
    __table_args__ = {"schema": "calibre"}

    id = Column(Integer, primary_key=True)
    book = Column(Integer, ForeignKey("books.id"), nullable=False)
    format = Column(String(collation="NOCASE"), nullable=False)
    uncompressed_size = Column(Integer, nullable=False)
    name = Column(String, nullable=False)

    def __init__(self, book, book_format, uncompressed_size, name):
        super().__init__()
        self.book = book
        self.format = book_format
        self.uncompressed_size = uncompressed_size
        self.name = name

    # ToDo: Check
    def get(self):
        return self.name

    def __repr__(self):
        return f"<Data('{self.book},{self.format}{self.uncompressed_size}{self.name}')>"


class Metadata_Dirtied(Base):
    __tablename__ = "metadata_dirtied"
    id = Column(Integer, primary_key=True, autoincrement=True)
    book = Column(Integer, ForeignKey("books.id"), nullable=False, unique=True)

    def __init__(self, book):
        super().__init__()
        self.book = book


class Books(Base):
    __tablename__ = "books"

    DEFAULT_PUBDATE = datetime(101, 1, 1, 0, 0, 0, 0)  # ("0101-01-01 00:00:00+00:00")

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(collation="NOCASE"), nullable=False, default="Unknown")
    sort = Column(String(collation="NOCASE"))
    author_sort = Column(String(collation="NOCASE"))
    timestamp = Column(TIMESTAMP, default=lambda: datetime.now(UTC))
    pubdate = Column(TIMESTAMP, default=DEFAULT_PUBDATE)
    series_index = Column(String, nullable=False, default="1.0")
    last_modified = Column(TIMESTAMP, default=lambda: datetime.now(UTC))
    path = Column(String, default="", nullable=False)
    has_cover = Column(Integer, default=0)
    uuid = Column(String)
    # isbn = Column(String(collation='NOCASE'), default="")
    # flags = Column(Integer, nullable=False, default=1)

    authors = relationship(Authors, secondary=books_authors_link, backref="books")
    tags = relationship(Tags, secondary=books_tags_link, backref="books", order_by="Tags.name")
    comments = relationship(Comments, backref="books")
    data = relationship(Data, backref="books")
    series = relationship(Series, secondary=books_series_link, backref="books")
    ratings = relationship(Ratings, secondary=books_ratings_link, backref="books")
    languages = relationship(Languages, secondary=books_languages_link, backref="books")
    publishers = relationship(Publishers, secondary=books_publishers_link, backref="books")
    identifiers = relationship(Identifiers, backref="books")

    def __init__(
        self,
        title,
        sort,
        author_sort,
        timestamp,
        pubdate,
        series_index,
        last_modified,
        path,
        has_cover,
        authors,
        tags,
        languages=None,
    ):
        super().__init__()
        self.title = title
        self.sort = sort
        self.author_sort = author_sort
        self.timestamp = timestamp
        self.pubdate = pubdate
        self.series_index = series_index
        self.last_modified = last_modified
        self.path = path
        self.has_cover = has_cover is not None

    def __repr__(self):
        return f"<Books('{self.title},{self.sort}{self.author_sort}{self.timestamp}{self.pubdate}{self.series_index}{self.last_modified}{self.path}{self.has_cover}')>"

    @property
    def atom_timestamp(self):
        # OPDS atom:updated is defined as "the most recent instant in time
        # when the entry was modified". Books.timestamp is the date added and
        # never changes after import, so metadata and cover edits were
        # invisible to OPDS sync clients. Use last_modified, which Calibre
        # updates on every metadata or cover change; fall back to timestamp
        # only if last_modified happens to be missing.
        t = self.last_modified or self.timestamp
        return t.strftime("%Y-%m-%dT%H:%M:%S+00:00") if t else ""  # pyright: ignore[reportGeneralTypeIssues]


class CustomColumns(Base):
    __tablename__ = "custom_columns"

    id = Column(Integer, primary_key=True)
    label = Column(String)
    name = Column(String)
    datatype = Column(String)
    mark_for_delete = Column(Boolean)
    editable = Column(Boolean)
    display = Column(String)
    is_multiple = Column(Boolean)
    normalized = Column(Boolean)

    def get_display_dict(self):
        display_dict = json.loads(self.display)  # pyright: ignore[reportArgumentType]
        return display_dict

    def to_json(self, value, extra, sequence):
        content = {}
        content["table"] = "custom_column_" + str(self.id)
        content["column"] = "value"
        content["datatype"] = self.datatype
        content["is_multiple"] = None if not self.is_multiple else "|"  # pyright: ignore[reportGeneralTypeIssues]
        content["kind"] = "field"
        content["name"] = self.name
        content["search_terms"] = ["#" + self.label]
        content["label"] = self.label
        content["colnum"] = self.id
        content["display"] = self.get_display_dict()
        content["is_custom"] = True
        content["is_category"] = self.datatype in ["text", "rating", "enumeration", "series"]
        content["link_column"] = "value"
        content["category_sort"] = "value"
        content["is_csp"] = False
        content["is_editable"] = self.editable
        content["rec_index"] = sequence + 22  # toDo why ??
        if isinstance(value, datetime):
            content["#value#"] = {
                "__class__": "datetime.datetime",
                "__value__": value.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            }
        else:
            content["#value#"] = value
        content["#extra#"] = extra
        content["is_multiple2"] = (
            {}
            if not self.is_multiple
            else {
                "cache_to_list": "|",
                "ui_to_list": ",",  # pyright: ignore[reportGeneralTypeIssues]
                "list_to_ui": ", ",
            }
        )
        return json.dumps(content, ensure_ascii=False)


class AlchemyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o.__class__, DeclarativeMeta):
            # an SQLAlchemy class
            fields = {}
            for field in [x for x in dir(o) if not x.startswith("_") and x != "metadata" and x != "password"]:
                if field == "books":
                    continue
                data = o.__getattribute__(field)
                try:
                    if isinstance(data, str):
                        data = data.replace("'", "'")
                    elif isinstance(data, InstrumentedList):
                        el = []
                        # ele = None
                        for ele in data:
                            if hasattr(ele, "value"):  # converter for custom_column values
                                el.append(str(ele.value))
                            elif ele.get:
                                el.append(ele.get())
                            else:
                                el.append(json.dumps(ele, cls=AlchemyEncoder))
                        data = " & ".join(el) if field == "authors" else ",".join(el)
                        if data == "[]":
                            data = ""
                    else:
                        json.dumps(data)
                    fields[field] = data
                except Exception:
                    fields[field] = ""
            # a json-encodable dict
            return fields

        return json.JSONEncoder.default(self, o)


class CalibreDB:
    config = None
    config_calibre_dir = None
    app_db_path = None

    def __init__(
        self, _app: Flask = None
    ):  # , expire_on_commit=True, init=False):  # pyright: ignore[reportArgumentType]
        """Initialize a new CalibreDB session"""
        self.Session = None
        # if init:
        #    self.init_db(expire_on_commit)
        if _app is not None and not _app._got_first_request:
            self.init_app(_app)

    def init_app(self, _app):
        _app.teardown_appcontext(self.teardown)

    @classmethod
    def setup_db_cc_classes(cls, cc):
        global cc_classes
        cc_ids = []
        books_custom_column_links = {}
        for row in cc:
            if row.datatype not in cc_exceptions:
                if row.datatype == "series":
                    dicttable = {
                        "__tablename__": "books_custom_column_" + str(row.id) + "_link",
                        "id": Column(Integer, primary_key=True),
                        "book": Column(Integer, ForeignKey("books.id"), primary_key=True),
                        "map_value": Column(
                            "value", Integer, ForeignKey("custom_column_" + str(row.id) + ".id"), primary_key=True
                        ),
                        "extra": Column(Float),
                        "asoc": relationship("custom_column_" + str(row.id), uselist=False),
                        "value": association_proxy("asoc", "value"),
                    }
                    books_custom_column_links[row.id] = type(
                        str("books_custom_column_" + str(row.id) + "_link"), (Base,), dicttable
                    )
                if row.datatype in ["rating", "text", "enumeration"]:
                    books_custom_column_links[row.id] = Table(
                        "books_custom_column_" + str(row.id) + "_link",
                        Base.metadata,
                        Column("book", Integer, ForeignKey("books.id"), primary_key=True),
                        Column("value", Integer, ForeignKey("custom_column_" + str(row.id) + ".id"), primary_key=True),
                    )
                cc_ids.append([row.id, row.datatype])

                ccdict = {"__tablename__": "custom_column_" + str(row.id), "id": Column(Integer, primary_key=True)}
                if row.datatype == "float":
                    ccdict["value"] = Column(Float)
                elif row.datatype == "int":
                    ccdict["value"] = Column(Integer)
                elif row.datatype == "datetime":
                    ccdict["value"] = Column(TIMESTAMP)  # pyright: ignore[reportArgumentType]
                elif row.datatype == "bool":
                    ccdict["value"] = Column(Boolean)  # pyright: ignore[reportArgumentType]
                else:
                    ccdict["value"] = Column(String)  # pyright: ignore[reportArgumentType]
                if row.datatype in ["float", "int", "bool", "datetime", "comments"]:
                    ccdict["book"] = Column(Integer, ForeignKey("books.id"))
                cc_classes[row.id] = type(str("custom_column_" + str(row.id)), (Base,), ccdict)

        for cc_id in cc_ids:
            if cc_id[1] in ["bool", "int", "float", "datetime", "comments"]:
                setattr(
                    Books,
                    "custom_column_" + str(cc_id[0]),
                    relationship(
                        cc_classes[cc_id[0]], primaryjoin=(Books.id == cc_classes[cc_id[0]].book), backref="books"
                    ),
                )
            elif cc_id[1] == "series":
                setattr(
                    Books,
                    "custom_column_" + str(cc_id[0]),
                    relationship(books_custom_column_links[cc_id[0]], backref="books"),
                )
            else:
                setattr(
                    Books,
                    "custom_column_" + str(cc_id[0]),
                    relationship(cc_classes[cc_id[0]], secondary=books_custom_column_links[cc_id[0]], backref="books"),
                )

    @classmethod
    def check_valid_db(cls, config_calibre_dir, app_db_path, config_calibre_uuid):
        if not config_calibre_dir:
            return False, False
        dbpath = os.path.join(config_calibre_dir, "metadata.db")
        if not os.path.exists(dbpath):
            return False, False
        try:
            check_engine = create_engine(
                "sqlite://",
                echo=False,
                isolation_level="SERIALIZABLE",
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            with check_engine.begin() as connection:
                connection.execute(text("attach database '{}' as calibre;".format(dbpath.replace("'", "''"))))
                connection.execute(text("attach database '{}' as app_settings;".format(app_db_path.replace("'", "''"))))
                local_session = scoped_session(sessionmaker())
                local_session.configure(bind=connection)
                database_uuid = local_session().query(Library_Id).one_or_none()

            check_engine.connect()
            db_change = config_calibre_uuid != database_uuid.uuid  # pyright: ignore[reportOptionalMemberAccess]
        except Exception:
            return False, False
        return True, db_change

    def teardown(self, exception):
        ctx = g.get("lib_sql")
        if ctx:
            ctx.close()

    @property
    def session(self) -> "scoped_session":  # pyright: ignore[reportMissingTypeArgument]
        # connect or get active connection
        if not g.get("lib_sql"):
            g.lib_sql = self.connect()
        return g.lib_sql  # type: ignore[return-value] # pyright: ignore[reportReturnType]

    @classmethod
    def update_config(cls, config, config_calibre_dir, app_db_path):
        cls.config = config
        cls.config_calibre_dir = config_calibre_dir
        cls.app_db_path = app_db_path

    def connect(self):
        return self.setup_db(self.config_calibre_dir, self.app_db_path)

    @classmethod
    def setup_db(cls, config_calibre_dir, app_db_path):

        if not config_calibre_dir:
            cls.config.invalidate()  # pyright: ignore[reportOptionalMemberAccess]
            return None

        dbpath = os.path.join(config_calibre_dir, "metadata.db")
        if not os.path.exists(dbpath):
            cls.config.invalidate()  # pyright: ignore[reportOptionalMemberAccess]
            return None

        try:
            engine = create_engine(
                "sqlite://",
                echo=False,
                isolation_level="SERIALIZABLE",
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            with engine.begin() as connection:
                connection.execute(text("PRAGMA cache_size = 10000;"))
                connection.execute(text("attach database '{}' as calibre;".format(dbpath.replace("'", "''"))))
                connection.execute(text("attach database '{}' as app_settings;".format(app_db_path.replace("'", "''"))))

            conn = engine.connect()
            # conn.text_factory = lambda b: b.decode(errors = 'ignore') possible fix for #1302
        except Exception as ex:
            cls.config.invalidate(ex)  # pyright: ignore[reportOptionalMemberAccess]
            return None

        cls.config.db_configured = True  # pyright: ignore[reportOptionalMemberAccess]

        if not cc_classes:
            try:
                cc = conn.execute(text("SELECT id, datatype FROM custom_columns"))
                cls.setup_db_cc_classes(cc)
            except OperationalError as e:
                log.error_or_exception(e)
                return None

        session_factory = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True))

        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            from flask import g

            g.db_query_start_time = time.time()

        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            from flask import g, has_request_context

            if not has_request_context() or not hasattr(g, "db_query_start_time"):
                return
            duration = time.time() - g.db_query_start_time
            endpoint = getattr(g, "request_endpoint", "unknown")
            # Check if prometheus metrics are available (set by web.py on startup)
            try:
                from cps import web

                if not web.prometheus_available:
                    return
                web.DB_QUERY_TIME.labels(query_type=endpoint).observe(duration)
                web.DB_QUERY_COUNT.labels(query_type=endpoint).inc()
                if duration > 0.1:
                    web.SLOW_DB_QUERY_COUNT.labels(query_type=endpoint, threshold_ms="100").inc()
            except (ImportError, AttributeError):
                return

        return session_factory

    def get_book(self, book_id):
        return self.session.query(Books).filter(Books.id == book_id).first()

    def _eager_load_relationships(self, query, relationships=None):
        """Load only the book relationships required by the consuming view.

        Detail and UUID lookups keep the full profile. List and feed views pass
        a small profile so unrelated Calibre relationships are not materialized
        for every row on the page.
        """
        if relationships is None:
            relationships = ("authors", "tags", "series", "publishers", "ratings", "languages", "data")
        return query.options(*(selectinload(getattr(Books, name)) for name in relationships))

    def get_filtered_book(self, book_id, allow_show_archived=False):
        q = self.session.query(Books).filter(Books.id == book_id).filter(self.common_filters(allow_show_archived))
        return self._eager_load_relationships(q).first()

    def get_book_read_archived(self, book_id, read_column, allow_show_archived=False):
        if not read_column:
            bd = (
                self.session.query(Books, ub.ReadBook.read_status, ub.ArchivedBook.is_archived)
                .select_from(Books)
                .join(
                    ub.ReadBook,
                    and_(ub.ReadBook.user_id == int(current_user.id), ub.ReadBook.book_id == book_id),
                    isouter=True,
                )
            )
        else:
            try:
                read_column = cc_classes[read_column]
                bd = (
                    self.session.query(Books, read_column.value, ub.ArchivedBook.is_archived)
                    .select_from(Books)
                    .join(read_column, read_column.book == book_id, isouter=True)
                )
            except (KeyError, AttributeError, IndexError):
                log.error(f"Custom Column No.{read_column} does not exist in calibre database")
                # Skip linking read column and return None instead of read status
                bd = self.session.query(Books, None, ub.ArchivedBook.is_archived)  # pyright: ignore[reportCallIssue,reportArgumentType]
        return (
            self._eager_load_relationships(bd)
            .filter(Books.id == book_id)
            .join(
                ub.ArchivedBook,
                and_(Books.id == ub.ArchivedBook.book_id, int(current_user.id) == ub.ArchivedBook.user_id),
                isouter=True,
            )  # pyright: ignore[reportArgumentType]
            .filter(self.common_filters(allow_show_archived))
            .first()
        )

    def get_book_by_uuid(self, book_uuid):
        return self._eager_load_relationships(self.session.query(Books).filter(Books.uuid == book_uuid)).first()

    def get_book_format(self, book_id, file_format):
        return self.session.query(Data).filter(Data.book == book_id).filter(Data.format == file_format).first()  # pyright: ignore[reportGeneralTypeIssues]

    def set_metadata_dirty(self, book_id):
        if not self.session.query(Metadata_Dirtied).filter(Metadata_Dirtied.book == book_id).one_or_none():  # pyright: ignore[reportGeneralTypeIssues]
            self.session.add(Metadata_Dirtied(book_id))

    def delete_dirty_metadata(self, book_id):
        try:
            self.session.query(Metadata_Dirtied).filter(Metadata_Dirtied.book == book_id).delete()  # pyright: ignore[reportGeneralTypeIssues]
            self.session.commit()
        except OperationalError as e:
            self.session.rollback()
            log.error(f"Database error: {e}")

    # Language and content filters for displaying in the UI
    def common_filters(self, allow_show_archived=False, return_all_languages=False):
        if not allow_show_archived:
            archived_filter = ~Books.id.in_(
                ub.session.query(ub.ArchivedBook.book_id)
                .filter(ub.ArchivedBook.user_id == int(current_user.id))
                .filter(ub.ArchivedBook.is_archived)
            )
        else:
            archived_filter = true()

        if current_user.filter_language() == "all" or return_all_languages:
            lang_filter = true()
        else:
            lang_filter = Books.languages.any(Languages.lang_code == current_user.filter_language())  # pyright: ignore[reportGeneralTypeIssues]
        negtags_list = current_user.list_denied_tags()
        postags_list = current_user.list_allowed_tags()
        neg_content_tags_filter = false() if negtags_list == [""] else Books.tags.any(Tags.name.in_(negtags_list))  # pyright: ignore[reportGeneralTypeIssues]
        pos_content_tags_filter = true() if postags_list == [""] else Books.tags.any(Tags.name.in_(postags_list))  # pyright: ignore[reportGeneralTypeIssues]
        if self.config.config_restricted_column:  # pyright: ignore[reportOptionalMemberAccess]
            try:
                pos_cc_list = current_user.allowed_column_value.split(",")
                pos_content_cc_filter = (
                    true()
                    if pos_cc_list == [""]
                    else getattr(
                        Books, "custom_column_" + str(self.config.config_restricted_column)
                    ).  # pyright: ignore[reportOptionalMemberAccess]
                    any(cc_classes[self.config.config_restricted_column].value.in_(pos_cc_list))
                )  # pyright: ignore[reportOptionalMemberAccess,reportArgumentType]
                neg_cc_list = current_user.denied_column_value.split(",")
                neg_content_cc_filter = (
                    false()
                    if neg_cc_list == [""]
                    else getattr(
                        Books, "custom_column_" + str(self.config.config_restricted_column)
                    ).  # pyright: ignore[reportOptionalMemberAccess]
                    any(cc_classes[self.config.config_restricted_column].value.in_(neg_cc_list))
                )  # pyright: ignore[reportOptionalMemberAccess,reportArgumentType]
            except (KeyError, AttributeError, IndexError):
                pos_content_cc_filter = false()
                neg_content_cc_filter = true()
                log.error(f"Custom Column No.{self.config.config_restricted_column} does not exist in calibre database")  # pyright: ignore[reportOptionalMemberAccess]
                flash(
                    _(
                        "Custom Column No.%(column)d does not exist in calibre database",
                        column=self.config.config_restricted_column,
                    ),  # pyright: ignore[reportOptionalMemberAccess]
                    category="error",
                )

        else:
            pos_content_cc_filter = true()
            neg_content_cc_filter = false()
        return and_(
            lang_filter,
            pos_content_tags_filter,
            ~neg_content_tags_filter,
            pos_content_cc_filter,
            ~neg_content_cc_filter,
            archived_filter,
        )

    def generate_linked_query(self, config_read_column, database):
        if not config_read_column:
            query = (
                self.session.query(database, ub.ArchivedBook.is_archived, ub.ReadBook.read_status)
                .select_from(Books)
                .outerjoin(
                    ub.ReadBook, and_(ub.ReadBook.user_id == int(current_user.id), ub.ReadBook.book_id == Books.id)
                )
            )
        else:
            try:
                read_column = cc_classes[config_read_column]
                query = (
                    self.session.query(database, ub.ArchivedBook.is_archived, read_column.value)
                    .select_from(Books)
                    .outerjoin(read_column, read_column.book == Books.id)
                )
            except (KeyError, AttributeError, IndexError):
                log.error(f"Custom Column No.{config_read_column} does not exist in calibre database")
                # Skip linking read column and return None instead of read status
                query = self.session.query(database, None, ub.ArchivedBook.is_archived)  # pyright: ignore[reportCallIssue,reportArgumentType]
        return query.outerjoin(
            ub.ArchivedBook, and_(Books.id == ub.ArchivedBook.book_id, int(current_user.id) == ub.ArchivedBook.user_id)
        )  # pyright: ignore[reportArgumentType]

    @staticmethod
    def get_checkbox_sorted(inputlist, state, offset, limit, order, combo=False):
        outcome = []
        elementlist = {ele[0].id: ele for ele in inputlist} if combo else {ele.id: ele for ele in inputlist}
        for entry in state:
            with contextlib.suppress(KeyError):
                outcome.append(elementlist[entry])
            del elementlist[entry]
        for entry in elementlist:
            outcome.append(elementlist[entry])
        if order == "asc":
            outcome.reverse()
        return outcome[offset : offset + limit]

    # Fill indexpage with all requested data from database
    def fill_indexpage(
        self,
        page,
        pagesize,
        database,
        db_filter,
        order,
        join_archive_read=False,
        config_read_column=0,
        *join,
        relationship_loaders=None,
    ):
        return self.fill_indexpage_with_archived_books(
            page,
            database,
            pagesize,
            db_filter,
            order,
            False,
            join_archive_read,
            config_read_column,
            *join,
            relationship_loaders=relationship_loaders,
        )

    def fill_indexpage_with_archived_books(
        self,
        page,
        database,
        pagesize,
        db_filter,
        order,
        allow_show_archived,
        join_archive_read,
        config_read_column,
        *join,
        relationship_loaders=None,
    ):
        pagesize = pagesize or self.config.config_books_per_page  # pyright: ignore[reportOptionalMemberAccess]
        if current_user.show_detail_random():
            random_query = self.generate_linked_query(config_read_column, database)
            randm = (
                self._eager_load_relationships(random_query, relationship_loaders)
                .filter(self.common_filters(allow_show_archived))
                .order_by(func.random())
                .limit(self.config.config_random_books)
                .all()
            )  # pyright: ignore[reportOptionalMemberAccess]
        else:
            randm = false()

        if join_archive_read:
            query = self.generate_linked_query(config_read_column, database)
        else:
            query = self.session.query(database)
        off = int(int(pagesize) * (page - 1))

        indx = len(join)
        element = 0
        while indx:
            if indx >= 3:
                query = query.outerjoin(join[element], join[element + 1]).outerjoin(join[element + 2])
                indx -= 3
                element += 3
            elif indx == 2:
                query = query.outerjoin(join[element], join[element + 1])
                indx -= 2
                element += 2
            elif indx == 1:
                query = query.outerjoin(join[element])
                indx -= 1
                element += 1
        query = query.filter(db_filter).filter(self.common_filters(allow_show_archived))
        entries = []
        pagination = []
        try:
            count_expression = func.count(func.distinct(Books.id)) if join else func.count(Books.id)
            total_count = query.order_by(None).with_entities(count_expression).scalar() or 0
            pagination = Pagination(page, pagesize, total_count)
            entries = (
                self._eager_load_relationships(query, relationship_loaders)
                .order_by(*order)
                .offset(off)
                .limit(pagesize)
                .all()
            )
        except Exception as ex:
            log.error_or_exception(ex)
        # display authors in right order
        entries = self.order_authors(entries, True, join_archive_read)
        return entries, randm, pagination

    # Orders all Authors in the list according to authors sort
    def order_authors(self, entries, list_return=False, combined=False):
        for entry in entries:
            if combined:
                sort_authors = entry.Books.author_sort.split("&")
                authors_list = entry.Books.authors
            else:
                sort_authors = entry.author_sort.split("&")
                authors_list = entry.authors

            # Create dictionary for O(1) lookup instead of nested loops
            authors_by_sort = {}
            authors_by_id = {}
            for author in authors_list:
                authors_by_sort[author.sort] = author
                authors_by_id[author.id] = author

            authors_ordered = []
            ids_remaining = set(authors_by_id.keys())

            # Order authors based on sort field using dictionary lookup
            for auth in sort_authors:
                auth = strip_whitespaces(auth)
                if auth in authors_by_sort:
                    author = authors_by_sort[auth]
                    authors_ordered.append(author)
                    ids_remaining.discard(author.id)
                else:
                    # This can happen if author_sort has stale data or formatting issues
                    book_id = entry.id if isinstance(entry, Books) else (entry.Books.id if combined else entry.id)
                    log.warning(f"Author '{auth}' of book {book_id} not found in author list, skipping in sort order")

            # Add any remaining authors not in sort order
            for author_id in ids_remaining:
                authors_ordered.append(authors_by_id[author_id])

            if list_return:
                if combined:
                    entry.Books.authors = authors_ordered
                else:
                    entry.ordered_authors = authors_ordered
            else:
                return authors_ordered
        return entries

    def get_typeahead(self, database, query, replace=("", ""), tag_filter=true()):
        query = query or ""
        self.create_functions()
        entries = (
            self.session.query(database)
            .filter(tag_filter)
            .filter(func.lower(database.name).ilike("%" + query + "%"))
            .all()
        )
        json_dumps = json.dumps([{"name": r.name.replace(*replace)} for r in entries])
        return json_dumps

    def check_exists_book(self, authr, title):
        self.create_functions()
        q = []
        author_terms = re.split(r"\s*&\s*", authr)
        for author_term in author_terms:
            q.append(Books.authors.any(func.lower(Authors.name).ilike("%" + author_term + "%")))  # pyright: ignore[reportGeneralTypeIssues]

        return (
            self.session.query(Books)
            .filter(and_(Books.authors.any(and_(*q)), func.lower(Books.title).ilike("%" + title + "%")))
            .first()
        )  # pyright: ignore[reportGeneralTypeIssues]

    def search_query(self, term, config, *join):
        term = strip_whitespaces(term).lower()
        self.create_functions()

        # Try FTS5 search first for better performance
        fts_ids = None
        # Check if FTS5 table exists before attempting search
        if not hasattr(self, "_fts_available"):
            try:
                result = self.session.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name='books_fts'")
                ).fetchone()
                self._fts_available = result is not None  # pyright: ignore[reportUninitializedInstanceVariable]
            except Exception:
                self._fts_available = False

        if self._fts_available:
            try:
                # Escape FTS5 special characters to prevent query errors
                term_fts = term.replace('"', '""')
                # Wrap in quotes for phrase matching and better accuracy
                fts_results = self.session.execute(
                    text("SELECT DISTINCT rowid FROM books_fts WHERE books_fts MATCH :term"), {"term": f'"{term_fts}"'}
                ).fetchall()
                if fts_results:
                    fts_ids = [r[0] for r in fts_results]
            except Exception as ex:
                # FTS5 query failed, fall back to traditional search
                log.debug(f"FTS5 search failed for term '{term}', using fallback: {ex}")

        # Build base query with optimized joins
        base_query = self.generate_linked_query(config.config_read_column, Books)
        base_query = base_query.filter(self.common_filters(True))
        base_query = self._eager_load_relationships(base_query, LIST_RELATIONSHIPS["ajax"])
        if len(join) == 6:
            base_query = (
                base_query.outerjoin(join[0], join[1]).outerjoin(join[2]).outerjoin(join[3], join[4]).outerjoin(join[5])
            )
        if len(join) == 3:
            base_query = base_query.outerjoin(join[0], join[1]).outerjoin(join[2])
        elif len(join) == 2:
            base_query = base_query.outerjoin(join[0], join[1])
        elif len(join) == 1:
            base_query = base_query.outerjoin(join[0])

        # If FTS5 found results, use those IDs
        if fts_ids:
            return base_query.filter(Books.id.in_(fts_ids))

        # Fallback to traditional search with optimized subqueries
        author_terms = re.split("[, ]+", term)

        # Use subquery for authors to avoid expensive .any() with OR
        author_subquery = self.session.query(books_authors_link.c.book).join(
            Authors, books_authors_link.c.author == Authors.id
        )
        author_filters = []
        for author_term in author_terms:
            author_filters.append(func.lower(Authors.name).ilike("%" + author_term + "%"))  # pyright: ignore[reportGeneralTypeIssues]
        if author_filters:
            author_subquery = author_subquery.filter(and_(*author_filters))

        # Build optimized filter expressions
        cc = self.get_cc_columns(config, filter_config_custom_read=True)
        filter_expression = [
            Books.id.in_(
                self.session.query(books_tags_link.c.book)
                .join(Tags, books_tags_link.c.tag == Tags.id)
                .filter(func.lower(Tags.name).ilike("%" + term + "%"))
            ),  # pyright: ignore[reportGeneralTypeIssues]
            Books.id.in_(
                self.session.query(books_series_link.c.book)
                .join(Series, books_series_link.c.series == Series.id)
                .filter(func.lower(Series.name).ilike("%" + term + "%"))
            ),  # pyright: ignore[reportGeneralTypeIssues]
            Books.id.in_(author_subquery),
            Books.id.in_(
                self.session.query(books_publishers_link.c.book)
                .join(Publishers, books_publishers_link.c.publisher == Publishers.id)
                .filter(func.lower(Publishers.name).ilike("%" + term + "%"))
            ),  # pyright: ignore[reportGeneralTypeIssues]
            func.lower(Books.title).ilike("%" + term + "%"),  # pyright: ignore[reportGeneralTypeIssues]
        ]

        for c in cc:
            if c.datatype not in ["datetime", "rating", "bool", "int", "float"]:
                filter_expression.append(
                    getattr(Books, "custom_column_" + str(c.id)).any(
                        func.lower(cc_classes[c.id].value).ilike("%" + term + "%")
                    )
                )

        return base_query.filter(or_(*filter_expression))

    def get_cc_columns(self, config, filter_config_custom_read=False):
        tmp_cc = self.session.query(CustomColumns).filter(CustomColumns.datatype.notin_(cc_exceptions)).all()
        cc = []
        r = None
        if config.config_columns_to_ignore:
            r = re.compile(config.config_columns_to_ignore)

        for col in tmp_cc:
            if filter_config_custom_read and config.config_read_column and config.config_read_column == col.id:
                continue
            if r and r.match(col.name):
                continue
            cc.append(col)

        return cc

    # read search results from calibre-database and return it (function is used for feed and simple search
    def get_search_results(self, term, config, offset=None, order=None, limit=None, *join):
        order = order[0] if order else [Books.sort]  # pyright: ignore[reportGeneralTypeIssues]
        pagination = None

        if offset is not None and limit is not None:
            offset = int(offset)
            limit_int = int(limit)

            # Use LIMIT+1 pattern to estimate total count without expensive count()
            query = self.search_query(term, config, *join).order_by(*order)
            result = query.limit(offset + limit_int + 1).all()

            # Check if there are more results
            has_more = len(result) > (offset + limit_int)
            result_count = offset + limit_int + 1 if has_more else len(result)  # Estimate: at least this many

            # Extract the page of results
            result = result[offset : offset + limit_int]
            pagination = Pagination((offset / limit_int + 1), limit_int, result_count)
        else:
            # No pagination, fetch all results
            result = self.search_query(term, config, *join).order_by(*order).all()
            result_count = len(result)

        ub.store_combo_ids(result)
        entries = self.order_authors(result, list_return=True, combined=True)

        return entries, result_count, pagination

    # Creates for all stored languages a translated speaking name in the array for the UI
    def speaking_language(self, languages=None, return_all_languages=False, with_count=False, reverse_order=False):

        if with_count:
            if not languages:
                languages = (
                    self.session.query(Languages, func.count("books_languages_link.book"))  # pyright: ignore[reportArgumentType]
                    .join(books_languages_link)
                    .join(Books)
                    .filter(self.common_filters(return_all_languages=return_all_languages))
                    .group_by(text("books_languages_link.lang_code"))
                    .all()
                )
            tags = []
            for lang in languages:
                tag = Category(isoLanguages.get_language_name(get_locale(), lang[0].lang_code), lang[0].lang_code)
                tags.append([tag, lang[1]])
            # Append all books without language to list
            if not return_all_languages:
                no_lang_count = (
                    self.session.query(Books)
                    .outerjoin(books_languages_link)
                    .outerjoin(Languages)
                    .filter(Languages.lang_code is None)  # pyright: ignore[reportGeneralTypeIssues,reportArgumentType]
                    .filter(self.common_filters())
                    .count()
                )
                if no_lang_count:
                    tags.append([Category(_("None"), "None", "none"), no_lang_count])
            return sorted(tags, key=lambda x: x[0].name.lower(), reverse=reverse_order)
        else:
            if not languages:
                languages = (
                    self.session.query(Languages)
                    .join(books_languages_link)
                    .join(Books)
                    .filter(self.common_filters(return_all_languages=return_all_languages))
                    .group_by(text("books_languages_link.lang_code"))
                    .all()
                )
            for lang in languages:
                lang.name = isoLanguages.get_language_name(get_locale(), lang.lang_code)
            return sorted(languages, key=lambda x: x.name, reverse=reverse_order)

    def create_functions(self, config=None):
        # user defined sort function for calibre databases (Series, etc.)
        def _title_sort(title):
            # calibre sort stuff
            title_pat = re.compile(config.config_title_regex, re.IGNORECASE)  # pyright: ignore[reportOptionalMemberAccess]
            match = title_pat.search(title)
            if match:
                prep = match.group(1)
                title = title[len(prep) :] + ", " + prep
            return strip_whitespaces(title)

        try:
            # sqlalchemy <1.4.24 and sqlalchemy 2.0
            conn = self.session.connection().connection.driver_connection
        except AttributeError:
            # sqlalchemy >1.4.24
            conn = self.session.connection().connection.connection
        try:
            if config:
                conn.create_function("title_sort", 1, _title_sort)  # pyright: ignore[reportOptionalMemberAccess]
            conn.create_function("uuid4", 0, lambda: str(uuid4()))  # pyright: ignore[reportOptionalMemberAccess]
            conn.create_function("lower", 1, lcase)  # pyright: ignore[reportOptionalMemberAccess]
        except sqliteOperationalError:
            pass

    def reconnect_db(self, config, app_db_path):
        # self.dispose()
        # self.engine.dispose()
        self.setup_db(config.config_calibre_dir, app_db_path)
        self.update_config(config, config.config_calibre_dir, app_db_path)


def lcase(s):
    try:
        return unidecode.unidecode(s.lower())
    except Exception as ex:
        _log = logger.create()
        _log.error_or_exception(ex)
        return s.lower()


def title_sort(title, config):
    # calibre sort stuff
    title_pat = re.compile(config.config_title_regex, re.IGNORECASE)
    match = title_pat.search(title)
    if match:
        prep = match.group(1)
        title = title[len(prep) :] + ", " + prep
    return strip_whitespaces(title)


class Category:
    name = None
    sort = None
    id = None
    count = None
    rating = None

    def __init__(self, name, cat_id, rating=None):
        self.name = name
        self.sort = name
        self.id = cat_id
        self.rating = rating
        self.count = 1
