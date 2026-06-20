#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#  Copyright (C) 2026 Taratsa contributors
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

"""ARD ``ai-catalog.json`` manifest for Calibre-Web.

Implements the Agentic Resource Discovery (ARD) capability manifest described
at https://agenticresourcediscovery.org/how_to_publish/. Each entry advertises
an agentic resource that this server exposes (OPDS feed, MCP server card,
agent skill, API linkset) so that ARD crawlers can discover and route agents
to the corresponding artifact.
"""

# Domain anchor used in the host identifier and the entry URNs. This is the
# deployment domain documented in AGENTS.md (pustaka.taratsa.id); the bare
# apex is used as the trust anchor.
ARD_PUBLISHER_DOMAIN = "taratsa.id"

# IANA-style media types referenced from the ARD spec v0.9 section 3.3 and 4.
ARD_MEDIA_TYPES = {
    "MCP_SERVER_CARD": "application/mcp-server-card+json",
    "AI_SKILL_MD": "application/ai-skill+md",
    "OPDS_CATALOG": "application/atom+xml;profile=opds-catalog",
    "LINKSET": "application/linkset+json",
}

# Representative natural-language queries per the spec (2-5 per entry). They
# enable the high-fidelity semantic search described in section 4.2.
_QUERIES_BOOK_SEARCH = [
    "find me a public-domain philosophy book in EPUB",
    "search the Calibre-Web library by author name",
    "browse the new arrivals on Pustaka Taratsa",
    "list all books in a given series",
]

_QUERIES_OPDS = [
    "give me the OPDS acquisition feed for the ebook library",
    "download the OPDS catalog as Atom XML",
    "list ebook formats available on this OPDS endpoint",
]

_QUERIES_API_LINKSET = [
    "find the API linkset describing this service",
    "show me the RFC 9727 service description for the ebook API",
]


def build_catalog(base_url):
    """Return the ARD catalog manifest for ``base_url``.

    ``base_url`` is the externally-visible root of this Calibre-Web instance
    (e.g. ``https://pustaka.taratsa.id``) and is used to build absolute
    ``url`` references for each entry.
    """
    base_url = base_url.rstrip("/")
    return {
        "specVersion": "1.0",
        "host": {
            "displayName": "Pustaka Taratsa",
            "identifier": f"did:web:{ARD_PUBLISHER_DOMAIN}",
        },
        "entries": [
            {
                "identifier": f"urn:air:{ARD_PUBLISHER_DOMAIN}:mcp:books",
                "displayName": "Calibre-Web MCP Server",
                "type": ARD_MEDIA_TYPES["MCP_SERVER_CARD"],
                "url": f"{base_url}/.well-known/mcp/server-card.json",
                "description": (
                    "Model Context Protocol server exposing the Calibre-Web "
                    "ebook catalog: books, authors, series, and cover images "
                    "as MCP resources."
                ),
                "representativeQueries": _QUERIES_BOOK_SEARCH,
            },
            {
                "identifier": f"urn:air:{ARD_PUBLISHER_DOMAIN}:skill:book-search",
                "displayName": "Calibre-Web Book Search Skill",
                "type": ARD_MEDIA_TYPES["AI_SKILL_MD"],
                "url": f"{base_url}/.well-known/agent-skills/agent-skills/SKILL.md",
                "description": (
                    "Agent skill describing how to search and browse the "
                    "Calibre-Web catalog by title, author, series, or keyword."
                ),
                "representativeQueries": _QUERIES_BOOK_SEARCH,
            },
            {
                "identifier": f"urn:air:{ARD_PUBLISHER_DOMAIN}:opds:catalog",
                "displayName": "Pustaka Taratsa OPDS Catalog",
                "type": ARD_MEDIA_TYPES["OPDS_CATALOG"],
                "url": f"{base_url}/opds/",
                "description": (
                    "OPDS catalog feed for ebook reader apps and other OPDS "
                    "clients, exposing navigation, search, and acquisition of "
                    "books in EPUB and PDF."
                ),
                "representativeQueries": _QUERIES_OPDS,
            },
            {
                "identifier": f"urn:air:{ARD_PUBLISHER_DOMAIN}:api:linkset",
                "displayName": "Calibre-Web API Linkset",
                "type": ARD_MEDIA_TYPES["LINKSET"],
                "url": f"{base_url}/.well-known/api-catalog",
                "description": (
                    "RFC 9727 linkset describing the service-description and "
                    "service-doc URLs for the OPDS API of this Calibre-Web "
                    "instance."
                ),
                "representativeQueries": _QUERIES_API_LINKSET,
            },
        ],
    }
