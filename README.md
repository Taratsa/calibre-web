# Calibre-Web

Calibre-Web is a web app that offers a clean and intuitive interface for browsing, reading, and downloading eBooks using a valid [Calibre](https://calibre-ebook.com) database.

[![License](https://img.shields.io/github/license/janeczku/calibre-web?style=flat-square)](https://github.com/janeczku/calibre-web/blob/master/LICENSE)
![Commit Activity](https://img.shields.io/github/commit-activity/w/janeczku/calibre-web?logo=github&style=flat-square&label=commits)
[![All Releases](https://img.shields.io/github/downloads/janeczku/calibre-web/total?logo=github&style=flat-square)](https://github.com/janeczku/calibre-web/releases)
[![PyPI](https://img.shields.io/pypi/v/calibreweb?logo=pypi&logoColor=fff&style=flat-square)](https://pypi.org/project/calibreweb/)
[![PyPI - Downloads](https://img.shields.io/pypi/dm/calibreweb?logo=pypi&logoColor=fff&style=flat-square)](https://pypi.org/project/calibreweb/)
[![Discord](https://img.shields.io/discord/838810113564344381?label=Discord&logo=discord&style=flat-square)](https://discord.gg/h2VsJ2NEfB)

<details>
<summary><strong>Table of Contents</strong> (click to expand)</summary>

1. [About](#calibre-web)
2. [Features](#features)
3. [Installation](#installation)
   - [Installation via pip (recommended)](#installation-via-pip-recommended)
   - [Quick start](#quick-start)
   - [Requirements](#requirements)
4. [Architecture](#architecture)
5. [Docker Images](#docker-images)
6. [Troubleshooting](#troubleshooting)
7. [Contributor Recognition](#contributor-recognition)
8. [Contact](#contact)
9. [Contributing to Calibre-Web](#contributing-to-calibre-web)

</details>

*This software is a fork of [library](https://github.com/mutschler/calibreserver) and licensed under the GPL v3 License.*

![Main screen](https://github.com/janeczku/calibre-web/wiki/images/main_screen.png)

## Features

- Modern and responsive Bootstrap 3 HTML5 interface
- Full graphical setup
- Comprehensive user management with fine-grained per-user permissions
- Admin interface
- Multilingual user interface supporting 20+ languages ([supported languages](https://github.com/janeczku/calibre-web/wiki/Translation-Status))
- OPDS feed for eBook reader apps
- Advanced search and filtering options
- Custom book collection (shelves) creation
- eBook metadata editing and deletion support
- Metadata download from various sources (extensible via plugins)
- eBook conversion through Calibre binaries
- eBook download restriction to logged-in users
- Public user registration support
- Send eBooks to E-Readers with a single click
- Sync Kobo devices with your Calibre library
- In-browser eBook reading support for multiple formats
- Upload new books in various formats, including audio formats
- Calibre Custom Columns support
- Content hiding based on categories and Custom Column content per user
- Self-update capability
- "Magic Link" login for easy access on eReaders
- LDAP, Google/GitHub OAuth, and proxy authentication support

## Architecture

This fork (branch `taratsa`) runs as the Pustaka deployment at `pustaka.taratsa.id`: a Flask backend (Calibre-Web),
an Astro SSR frontend, and a Manticore full-text index, behind Caddy and Cloudflare. Details per area are in
[AGENTS.md](AGENTS.md); deployment steps are in [DEPLOY.md](DEPLOY.md).

### Infrastructure

```mermaid
flowchart TB
    user["Browsers, OPDS and Kobo clients, crawlers"]
    cf["Cloudflare CDN<br/>caches /files/*, /_astro/*, covers"]

    subgraph host["Host"]
        caddy["Caddy :80/:443<br/>routes by path, sets Cache-Control"]
        script["build-frontend.sh<br/>seed + image rebuild"]
        subgraph caddy_net["Docker network caddy_net"]
            flask["calibre-web-automated<br/>Flask + gevent :8083<br/>auth, downloads, OPDS, Kobo, readers, OCR and index tasks"]
            astro["astro-frontend<br/>Astro SSR on Bun :4321<br/>catalog, book, author, search, data pages"]
        end
        subgraph search_net["Docker network search_net, internal, no route out"]
            manticore["manticore 32.1.3<br/>text_chunks index, no auth, no published port"]
        end
        lib[("library/<br/>Calibre metadata.db and book files, written by Flask uploads and edits")]
        data[("data/<br/>app.db, ocr-cache, analysis, clippings")]
        seed[("frontend/src/data<br/>seed JSON: books, slugs, authors, popular")]
    end

    ocr["TurboOCR server<br/>GPU, TURBOOCR_URL"]
    umami["Umami analytics"]
    fb["Formbricks feedback<br/>feedback.taratsa.id"]
    hc["Hardcover API<br/>optional metadata"]

    user --> cf --> caddy
    caddy -->|"/admin /login /download /files /read /show /opds /kobo /cover /api/read"| flask
    caddy -->|"everything else, /og, /read/id/ocr"| astro
    astro -->|"BACKEND_URL"| flask
    astro -->|"search reads"| manticore
    flask -->|"index writes"| manticore
    flask --- lib
    flask --- data
    flask -->|"PDF pages"| ocr
    flask -->|"server-side events"| umami
    flask -.-> hc
    user -.->|"widget, tracker"| fb
    user -.-> umami
    script -->|"reads"| lib
    script -->|"reads"| data
    script -->|"writes"| seed
    seed -->|"baked into image"| astro
    seed -->|"mounted read-only, book-slugs.json"| flask
```

| Component | Role | Exposure |
|---|---|---|
| Cloudflare | CDN in front of Caddy. Caches only `/files/*`, `/_astro/*` and covers; never `/download/*`, `/read/*`, `/show/*`, `/api/*`, `/opds*` | public |
| Caddy | Host-level reverse proxy, path routing, cache headers, 500 MB upload limit; serves `/_astro/*` and static assets itself with `file_server`; `old.pustaka.taratsa.id` goes straight to Flask | 80/443 |
| `calibre-web-automated` | Flask app on one gevent loop; owns auth, downloads and counters, OPDS, Kobo, readers, OCR, duplicate scans, admin | `127.0.0.1:8083`, `caddy_net`, `search_net` |
| `astro-frontend` | Public site rendered per request; reads `src/data` baked into the image, queries Manticore for in-text search | `caddy_net`, `search_net` |
| `manticore` | Full-text index over OCR/EPUB text (derived data, rebuildable) | `search_net` only |
| TurboOCR | External GPU OCR server for PDF pages | outbound from Flask |

### Request routing

```mermaid
flowchart LR
    req["Request"] --> c{"Caddy path match"}
    c -->|"/download/*"| dl["Flask: authorize, count, 302"]
    dl --> files["/files/id/fmt/version/sig<br/>signed, immutable, CDN-cached"]
    c -->|"/files/*"| files
    c -->|"/read/* /show/* /api/read/*"| rd["Flask: readers, Readium manifest, OCR API<br/>private, no-store"]
    c -->|"/opds* /kobo/*"| op["Flask: OPDS 5 min cache, Kobo sync"]
    c -->|"/cover/* /cover_thumb/*"| cv["Flask: cover or generated title card<br/>1 day cache"]
    c -->|"/book/NUMBER/"| lg["Flask: 301 to slug via book-slugs.json"]
    c -->|"/admin* /login* /me /ajax/*"| ad["Flask: stateful pages"]
    c -->|"/read/id/ocr/fmt/, /og/*.png"| as1["Astro: text reader, OG images"]
    c -->|"default"| as2["Astro SSR: /, /book/slug/, /author/, /search/, /search/text/, /data, /kliping/, /video/"]
```

### Data flow

```mermaid
flowchart LR
    subgraph sources["Sources of truth"]
        calib[("library/metadata.db<br/>+ book files")]
        appdb[("data/app.db<br/>users, downloads, settings")]
        cache[("data/ocr-cache<br/>extracted text")]
        clip[("data/clippings/*.md")]
    end

    upload["Upload, Calibre edit,<br/>bulk import"] --> calib
    calib -->|"PDF"| ocr["TurboOCR"] --> cache
    calib -->|"EPUB text"| cache

    cache -->|"chunk ~900 chars"| mant[("Manticore<br/>text_chunks")]
    cache -->|"Rust taratsa_text<br/>CorpusBuilder"| ana[("data/analysis<br/>corpus, book_text, author_text")]

    calib --> sd["seed.mjs"]
    appdb --> sd
    ana --> sd
    clip -->|"published only"| sd
    cache -->|"ready list"| sd
    sd --> json[("frontend/src/data<br/>books, slugs, file URLs,<br/>popular, ocr-ready, clippings")]
    json -->|"docker image build"| astro["Astro SSR"]
    json -->|"read-only mount"| flask["Flask: slug redirects"]
    mant --> astro

    calib -.->|"fingerprint change"| fts[("app.db books_fts<br/>trigram prefilter")]
    fts --> flask2["Flask: OPDS and legacy search"]
```

Notes on how the pieces fit:

- **Catalog changes are batch-published.** New or edited books appear on the Astro site after `./build-frontend.sh`
  (seed from the live `library/metadata.db` and `data/app.db`, rebuild the image, recreate the container, about a
  minute). Flask serves new books immediately.
- **Downloads are counted once, served by the CDN.** `/download` authorizes, counts (anonymous = user 0) and 302s to a
  signed, versioned `/files/...` URL that Cloudflare caches for a year; `/files` never counts.
- **Search has three layers.** `/search/` is an in-process MiniSearch index over `books.json` (Astro); `/search/text/`
  queries Manticore (passages inside the books); OPDS and the legacy UI use `cps/db.py` with an FTS5 prefilter.
- **Text analysis runs off the web loop.** The corpus rebuild (Rust, GIL released) and the full-text reindex are
  background tasks in Flask's worker; do not restart the Flask container while they or OCR run.
- **Manticore has no authentication.** It is reachable only on the internal `search_net`; never publish port 9308.

## Installation

### Installation via pip (recommended)

1. **Create a virtual environment**: It’s essential to isolate your Calibre-Web installation to avoid dependency conflicts. You can create a virtual environment by running:
   ```
   python3 -m venv calibre-web-env
   ```
2. **Activate the virtual environment**:
   ```
   source calibre-web-env/bin/activate
   ```
3. **Install Calibre-Web**: Use pip to install the application:
   ```
   pip install calibreweb
   ```
4. **Install optional features**: For additional functionality, you may need to install optional features. Refer to [this page](https://github.com/janeczku/calibre-web/wiki/Dependencies-in-Calibre-Web-Linux-and-Windows) for details on what can be installed.
5. **Start Calibre-Web**: After installation, you can start the application with:
   ```
   cps
   ```

*Note: Users of Raspberry Pi OS may encounter installation issues. If you do, try upgrading pip and/or installing cargo as follows:*
   ```
   ./venv/bin/python3 -m pip install --upgrade pip
   sudo apt install cargo
   ```

### Important Links
- For additional installation examples, check the following:
   - [Manual installation](https://github.com/janeczku/calibre-web/wiki/Manual-installation)
   - [Linux Mint installation](https://github.com/janeczku/calibre-web/wiki/How-To:-Install-Calibre-Web-in-Linux-Mint-19-or-20)
   - [Cloud Provider setup](https://github.com/janeczku/calibre-web/wiki/How-To:-Install-Calibre-Web-on-a-Cloud-Provider)

## Quick Start

1. **Access Calibre-Web**: Open your browser and navigate to:
   ```
   http://localhost:8083
   ```
   or for the OPDS catalog:
   ```
   http://localhost:8083/opds
   ```
2. **Log in**: Use the default admin credentials:
   - **Username:** admin
   - **Password:** admin123
3. **Database Setup**: If you do not have a Calibre database, download a sample from:
   ```
   https://github.com/janeczku/calibre-web/raw/master/library/metadata.db
   ```
   Move it out of the Calibre-Web folder to avoid overwriting during updates.
4. **Configure Calibre Database**: In the admin interface, set the `Location of Calibre database` to the path of the folder containing your Calibre library (where `metadata.db` is located) and click "Save".
5. **Google Drive Integration**: For hosting your Calibre library on Google Drive, refer to the [Google Drive integration guide](https://github.com/janeczku/calibre-web/wiki/G-Drive-Setup#using-google-drive-integration).
6. **Admin Configuration**: Configure your instance via the admin page, referring to the [Basic Configuration](https://github.com/janeczku/calibre-web/wiki/Configuration#basic-configuration) and [UI Configuration](https://github.com/janeczku/calibre-web/wiki/Configuration#ui-configuration) guides.

## Requirements

- **Python Version**: Ensure you have Python 3.7 or newer.
- **Imagemagick**: Required for cover extraction from EPUBs. Windows users may also need to install [Ghostscript](https://ghostscript.com/releases/gsdnld.html) for PDF cover extraction.
- **Optional Tools**:
   - **Calibre desktop program**: Recommended for on-the-fly conversion and metadata editing. Set the path to Calibre’s converter tool on the setup page.
   - **Kepubify tool**: Needed for Kobo device support. Download the tool and place the binary in `/opt/kepubify` on Linux or `C:\Program Files\kepubify` on Windows.

## Docker Images

Pre-built Docker images are available:

### **LinuxServer - x64, aarch64**
- **Docker Hub**: [linuxserver/calibre-web](https://hub.docker.com/r/linuxserver/calibre-web)
- **GitHub**: [linuxserver/docker-calibre-web](https://github.com/linuxserver/docker-calibre-web)
- **Optional Calibre layer**: [linuxserver/docker-mods](https://github.com/linuxserver/docker-mods/tree/universal-calibre)

To include the Calibre `ebook-convert` binary (x64 only), add the environment variable:
``` 
DOCKER_MODS=linuxserver/mods:universal-calibre
```
in your Docker run/compose file. Omit this variable for a lightweight image.

- **Paths Configuration**:
   - Set **Path to Calibre Binaries** to `/usr/bin`.
   - Set **Path to Unrar** to `/usr/bin/unrar`.

## Troubleshooting

- **Common Issues**: 
   - If you experience issues starting the application, check the log files located in the `logs` directory for error messages.
   - If eBooks fail to load, verify that the `Location of Calibre database` is correctly set and that the database file is accessible.
   - You need to enable uploads under `Basic settings` for this option to appear

- **Configuration Errors**: Ensure that your Calibre database is compatible and properly formatted. Refer to the Calibre documentation for guidance on maintaining the database.

- **Performance Problems**: 
   - If the application is slow, consider increasing the allocated resources (CPU/RAM) to your server or optimizing the Calibre database by removing duplicates and unnecessary entries.
   - Regularly clear the cache in your web browser to improve loading times.

- **User Management Issues**: If users are unable to log in or register, check the user permission settings in the admin interface. Ensure that registration is enabled and that users are being assigned appropriate roles.

- **Support Resources**: For additional help, consider visiting the [FAQ section](https://github.com/janeczku/calibre-web/wiki/FAQ) of the wiki or posting your questions in the [Discord community](https://discord.gg/h2VsJ2NEfB).

## Contributor Recognition

We would like to thank all the [contributors](https://github.com/janeczku/calibre-web/graphs/contributors) and maintainers of Calibre-Web for their valuable input and dedication to the project. Your contributions are greatly appreciated.

## Contact

Join us on [Discord](https://discord.gg/h2VsJ2NEfB)

For more information, How To's, and FAQs, please visit the [Wiki](https://github.com/janeczku/calibre-web/wiki)

## Contributing to Calibre-Web

To contribute, please check our [Contributing Guidelines](https://github.com/janeczku/calibre-web/blob/master/CONTRIBUTING.md). We welcome issues, feature requests, and pull requests from the community.

### Reporting Bugs

If you encounter bugs or issues, please report them in the [issues section](https://github.com/janeczku/calibre-web/issues) of the repository. Be sure to include detailed information about your setup and the problem encountered.

### Feature Requests

We welcome suggestions for new features. Please create a new issue in the repository to discuss your ideas.

## Additional Resources

- **Documentation**: Comprehensive documentation is available on the [Calibre-Web wiki](https://github.com/janeczku/calibre-web/wiki).
- **Community Contributions**: Explore the [community contributions](https://github.com/janeczku/calibre-web/pulls) to see ongoing work and how you can get involved.

---

Thank you for using Calibre-Web! We hope you enjoy managing your eBook library with our tool.
