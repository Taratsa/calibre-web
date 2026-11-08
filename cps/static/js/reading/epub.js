/* global $, calibre, Readium, screenfull, Pickr */

// EPUB reader built on the Readium ts-toolkit navigator (bundled in js/libs/readium.js, source in /readium-reader).
// The server (cps/readium.py) provides the manifest, the position list and single files out of the EPUB zip.

(function () {
    "use strict";

    // Transitional guard: a CDN may still serve the pre-Readium reader page (it loads epub.min.js and defines no
    // `calibre.manifestUrl`). Reload once under another cache key to get the current page; remove this block once
    // the CDN cache for /read/<id>/epub has expired or been purged.
    if (typeof calibre === "undefined" || !calibre.manifestUrl) {
        var pageUrl = new URL(window.location.href);
        if (!pageUrl.searchParams.has("rv")) {
            pageUrl.searchParams.set("rv", "readium");
            window.location.replace(pageUrl.href);
        } else {
            console.error("Reader page is out of date and could not be refreshed");
        }
        return;
    }

    if (typeof Readium === "undefined") {
        console.error("Readium navigator not loaded");
        return;
    }

    var BOOK_ID = calibre.bookId;
    var POSITION_KEY = "calibre.reader.locator." + BOOK_ID;

    // ---------------------------------------------------------------------------
    // Persistence helpers
    // ---------------------------------------------------------------------------

    function load(key, fallback) {
        try {
            var value = localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function save(key, value) {
        try { localStorage.setItem(key, String(value)); } catch (e) {}
    }

    // ---------------------------------------------------------------------------
    // Appearance settings (theme, font, size, columns, alignment)
    // ---------------------------------------------------------------------------

    var THEMES = {
        lightTheme: { bg: "#ffffff", fg: "#000000", title: "#4f4f4f" },
        darkTheme: { bg: "#202124", fg: "#ffffff", title: "#ffffff" },
        sepiaTheme: { bg: "#ece1ca", fg: "#000000", title: "#4f4f4f" },
        amberTheme: { bg: "#e8bf5e", fg: "#000000", title: "#2f2f2f" },
        blackTheme: { bg: "#000000", fg: "#ffffff", title: "#ffffff" },
    };
    var FONTS = { default: null, Yahei: "Microsoft YaHei", SimSun: "SimSun", KaiTi: "KaiTi", Arial: "Arial" };
    var MIN_FONT_SIZE = 70; // percent; Readium accepts 70%-400%
    var MAX_FONT_SIZE = 300;
    var FONT_STEP = 5;

    var appearance = {
        theme: load("calibre.reader.theme", "lightTheme"),
        customColor: load("calibre.reader.customTheme", "#ffffff"),
        fontSize: parseInt(load("calibre.reader.fontSize", "100"), 10) || 100,
        font: load("calibre.reader.font", "default"),
        textAlign: load("calibre.reader.textAlign", "default"),
        oneColumn: load("calibre.reader.columns", "auto") === "one",
    };
    appearance.fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, appearance.fontSize));
    if (!(appearance.theme in THEMES) && appearance.theme !== "customTheme") appearance.theme = "lightTheme";
    if (!(appearance.font in FONTS)) appearance.font = "default";
    if (["default", "left", "justify"].indexOf(appearance.textAlign) === -1) appearance.textAlign = "default";

    function luminanceIsLight(hex) {
        var value = hex.replace("#", "");
        if (value.length === 3) value = value.replace(/./g, "$&$&");
        var n = parseInt(value.slice(0, 6), 16);
        if (isNaN(n)) return true;
        function lin(c) {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        }
        var L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
        return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05);
    }

    function themeColors() {
        if (appearance.theme === "customTheme") {
            var light = luminanceIsLight(appearance.customColor);
            var text = light ? "#000000" : "#ffffff";
            return { bg: appearance.customColor, fg: text, title: text };
        }
        return THEMES[appearance.theme];
    }

    function preferences() {
        var colors = themeColors();
        return new Readium.EpubPreferences({
            backgroundColor: colors.bg,
            textColor: colors.fg,
            fontSize: appearance.fontSize / 100,
            fontFamily: FONTS[appearance.font],
            textAlign: appearance.textAlign === "default" ? null : appearance.textAlign,
            columnCount: appearance.oneColumn ? 1 : null,
            scroll: false,
        });
    }

    // ---------------------------------------------------------------------------
    // DOM handles
    // ---------------------------------------------------------------------------

    var $main = $("#main");
    var $divider = $("#divider");
    var $loader = $("#loader");
    var $next = $("#next");
    var $prev = $("#prev");
    var $sidebar = $("#sidebar");
    var $panels = $("#panels");
    var $tocView = $("#tocView");
    var $bookmarksList = $("#bookmarks");
    var $bookmarkBtn = $("#bookmark");
    var $settingBtn = $("#setting");
    var $settingsModal = $("#settings-modal");
    var $overlay = $(".overlay");
    var $slider = $("#slider");
    var $fullscreenBtn = $("#fullscreen");
    var $bookTitle = $("#book-title");
    var $chapterTitle = $("#chapter-title");
    var $titleSeperator = $("#title-seperator");
    var progressDiv = document.getElementById("progress");
    var pagesDiv = document.getElementById("pages-count");

    function tick(groupId, activeId) {
        $("#" + groupId + " span").text("");
        var button = document.getElementById(activeId);
        var mark = button && button.querySelector("span");
        if (mark) mark.textContent = "✓";
    }

    // Applies the theme to the page chrome around the reading area; the book content is themed by Readium.
    function paintChrome() {
        var colors = themeColors();
        document.getElementById("main").style.backgroundColor = colors.bg;
        document.getElementById("titlebar").style.color = colors.title;
        progressDiv.style.color = colors.title;
        $("#themes span").text("");
        var activeTick = appearance.theme === "customTheme"
            ? document.getElementById("customSelected")
            : document.querySelector("#" + appearance.theme + " span");
        if (activeTick) activeTick.textContent = "✓";
        var swatch = document.getElementById("customThemeSwatch");
        if (swatch) swatch.style.background = appearance.customColor;
        tick("font", appearance.font);
        tick("layout", appearance.oneColumn ? "nonespread" : "spread");
        tick("textAlign", "align-" + appearance.textAlign);
        document.getElementById("fontSizeDisplay").textContent = appearance.fontSize + "%";
    }

    // ---------------------------------------------------------------------------
    // Sidebar, settings modal, fullscreen
    // ---------------------------------------------------------------------------

    var sidebarOpen = false;
    var activePanel = "Toc";
    var sidebarReflow = load("calibre.reader.sidebarReflow", "false") === "true";
    $("#sidebarReflow").prop("checked", sidebarReflow);

    // `#main.closed` slides the page right and `#main.single` narrows it, both uncovering the sidebar underneath.
    function setSidebar(open) {
        sidebarOpen = open;
        $main.toggleClass(sidebarReflow ? "single" : "closed", open);
        $main.removeClass(sidebarReflow ? "closed" : "single");
        $sidebar.toggleClass("open", open);
        $slider.toggleClass("icon-right", open).toggleClass("icon-menu", !open);
    }

    $slider.on("click", function (e) {
        e.preventDefault();
        setSidebar(!sidebarOpen);
    });

    $panels.find(".show_view").on("click", function (e) {
        e.preventDefault();
        var panel = $(this).data("view");
        if (panel === "Toc" || panel === "Bookmarks") {
            if (panel !== activePanel) {
                $("#" + activePanel.toLowerCase() + "View").hide();
                $("#" + panel.toLowerCase() + "View").show();
                activePanel = panel;
                $panels.find(".active").removeClass("active");
                $panels.find("#show-" + panel).addClass("active");
            }
            if (!sidebarOpen) setSidebar(true);
        }
    });

    $("#sidebarReflow").on("click", function () {
        sidebarReflow = $(this).prop("checked");
        save("calibre.reader.sidebarReflow", sidebarReflow);
    });

    $settingBtn.on("click", function () { $settingsModal.addClass("md-show"); });
    $settingsModal.find(".closer").on("click", function () { $settingsModal.removeClass("md-show"); });
    $overlay.on("click", function () { $settingsModal.removeClass("md-show"); });

    if (typeof screenfull !== "undefined") {
        $fullscreenBtn.on("click", function () {
            try { screenfull.toggle($("#container")[0] || document.documentElement); } catch (e) {}
        });
        if (screenfull.raw && screenfull.raw.fullscreenchange) {
            document.addEventListener(screenfull.raw.fullscreenchange, function () {
                $fullscreenBtn.toggleClass("icon-resize-small", screenfull.isFullscreen)
                    .toggleClass("icon-resize-full", !screenfull.isFullscreen);
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Navigator lifecycle
    // ---------------------------------------------------------------------------

    var navigator = null;
    var publication = null;
    var positions = [];
    var current = null; // last locator reported by the navigator
    var rtl = false;

    function applyPreferences() {
        paintChrome();
        if (navigator) {
            navigator.submitPreferences(preferences()).catch(function (err) {
                console.error("Failed to apply reader preferences", err);
            });
        }
    }

    function go(locatorJson) {
        if (!navigator) return;
        var locator = Readium.Locator.deserialize(locatorJson);
        if (locator) navigator.go(locator, false, function () {});
    }

    function goToHref(href) {
        if (!navigator) return;
        var link = new Readium.Link({ href: href });
        navigator.goLink(link, false, function () {});
    }

    function step(direction) {
        if (!navigator) return;
        if (direction > 0) navigator.goRight(false, function () {}); else navigator.goLeft(false, function () {});
    }

    $next.on("click", function (e) { e.preventDefault(); step(1); });
    $prev.on("click", function (e) { e.preventDefault(); step(-1); });

    // ---------------------------------------------------------------------------
    // Table of contents
    // ---------------------------------------------------------------------------

    function renderTocList(links) {
        var $ul = $("<ul></ul>");
        links.forEach(function (link, index) {
            var $li = $("<li></li>").addClass("list_item");
            var children = link.children ? link.children.items : [];
            if (children.length) $li.append($("<a></a>").addClass("toc_toggle"));
            $li.append($("<a></a>").addClass("toc_link").text(link.title || "").attr("href", link.href));
            if (children.length) $li.append(renderTocList(children));
            $ul.append($li);
        });
        return $ul;
    }

    function renderToc() {
        $tocView.empty();
        var toc = publication.toc ? publication.toc.items : [];
        if (!toc.length) {
            // No usable ToC in the book: fall back to the reading order so the sidebar is never empty.
            toc = publication.readingOrder.items.map(function (item, i) {
                return { title: item.title || (i + 1), href: item.href, children: null };
            });
        }
        $tocView.append(renderTocList(toc));
        $tocView.find(".toc_link").on("click", function (e) {
            e.preventDefault();
            goToHref($(this).attr("href"));
            if (window.matchMedia("(max-width: 700px)").matches) setSidebar(false);
        });
        $tocView.find(".toc_toggle").on("click", function (e) {
            e.preventDefault();
            $(this).parent("li").toggleClass("openChapter");
        });
    }

    function highlightToc(locator) {
        var href = locator.href.split("#")[0];
        var best = null;
        $tocView.find(".toc_link").each(function () {
            var target = ($(this).attr("href") || "").split("#")[0];
            if (target === href) {
                // prefer the last entry of this resource that starts before the current position
                best = this;
            }
        });
        $tocView.find(".currentChapter").removeClass("currentChapter");
        if (best) {
            var $li = $(best).parent("li");
            $li.addClass("currentChapter");
            $li.parents("li").addClass("openChapter");
        }
    }

    // ---------------------------------------------------------------------------
    // Bookmarks (stored per user on the server; the key is a serialized Readium locator)
    // ---------------------------------------------------------------------------

    var bookmarks = []; // serialized locators (JSON strings)

    function locatorKey(locator) {
        // Stable identity of a place: resource + position inside the position list.
        return locator.href.split("#")[0] + "@" + (locator.locations.position || 0);
    }

    function bookmarkIndex(locator) {
        var key = locatorKey(locator);
        for (var i = 0; i < bookmarks.length; i++) {
            try {
                var saved = Readium.Locator.deserialize(JSON.parse(bookmarks[i]));
                if (saved && locatorKey(saved) === key) return i;
            } catch (e) {}
        }
        return -1;
    }

    function syncBookmarkButton() {
        var marked = current && bookmarkIndex(current) !== -1;
        $bookmarkBtn.toggleClass("icon-bookmark", !!marked).toggleClass("icon-bookmark-empty", !marked);
    }

    function pushBookmark(value) {
        if (!calibre.useBookmarks) return;
        var csrf = $("input[name='csrf_token']").val();
        $.ajax(calibre.bookmarkUrl, {
            method: "post",
            data: { bookmark: value || "" },
            headers: { "X-CSRFToken": csrf },
        }).fail(function (xhr, status, error) {
            console.error("bookmark save failed", error);
        });
    }

    function renderBookmarks() {
        $bookmarksList.empty();
        bookmarks.forEach(function (raw, index) {
            var locator;
            try { locator = Readium.Locator.deserialize(JSON.parse(raw)); } catch (e) { return; }
            if (!locator) return;
            var label = locator.title || "";
            if (!label && publication) {
                var item = publication.readingOrder.findWithHref(locator.href.split("#")[0]);
                label = (item && item.title) || "";
            }
            var percent = Math.round((locator.locations.totalProgression || 0) * 100);
            var $a = $("<a></a>").addClass("bookmark_link").attr("href", "#")
                .text((label ? label + " – " : "") + percent + "%")
                .on("click", function (e) {
                    e.preventDefault();
                    go(JSON.parse(raw));
                });
            $bookmarksList.append($("<li></li>").addClass("list_item").append($a));
        });
    }

    $bookmarkBtn.on("click", function () {
        if (!current) return;
        var index = bookmarkIndex(current);
        if (index === -1) {
            bookmarks.push(JSON.stringify(current.serialize()));
            pushBookmark(bookmarks[bookmarks.length - 1]);
        } else {
            bookmarks.splice(index, 1);
            pushBookmark(bookmarks.length ? bookmarks[bookmarks.length - 1] : "");
        }
        renderBookmarks();
        syncBookmarkButton();
    });

    if (!calibre.useBookmarks) {
        $bookmarkBtn.remove();
        $("#show-Bookmarks").remove();
    }

    // The server keeps a single bookmark per user and book: either a Readium locator (JSON) or an old epub.js CFI.
    function initialPosition() {
        var saved = load(POSITION_KEY, "");
        var source = saved || (calibre.bookmark && calibre.bookmark.charAt(0) === "{" ? calibre.bookmark : "");
        if (source) {
            try { return Readium.Locator.deserialize(JSON.parse(source)); } catch (e) {}
        }
        return undefined;
    }

    function restoreBookmarks() {
        if (calibre.bookmark && calibre.bookmark.charAt(0) === "{") bookmarks = [calibre.bookmark];
    }

    // ---------------------------------------------------------------------------
    // Progress display
    // ---------------------------------------------------------------------------

    function showProgress(locator) {
        var total = locator.locations.totalProgression;
        if (typeof total === "number") {
            progressDiv.textContent = Math.round(total * 100) + "%";
            progressDiv.style.visibility = "visible";
        }
        var position = locator.locations.position;
        if (position && positions.length) {
            pagesDiv.textContent = position + "/" + positions.length;
            pagesDiv.style.visibility = load("calibre.reader.showPages", "true") === "true" ? "visible" : "hidden";
        }
    }

    function updateEdges() {
        if (!navigator) return;
        $prev.toggleClass("disabled", !navigator.canGoBackward);
        $next.toggleClass("disabled", !navigator.canGoForward);
    }

    function onPositionChanged(locator) {
        current = locator;
        save(POSITION_KEY, JSON.stringify(locator.serialize()));
        highlightToc(locator);
        showProgress(locator);
        syncBookmarkButton();
        updateEdges();
        var item = publication && publication.readingOrder.findWithHref(locator.href.split("#")[0]);
        if (item && item.title) $chapterTitle.text(item.title);
    }

    // ---------------------------------------------------------------------------
    // Settings controls (called from read.html)
    // ---------------------------------------------------------------------------

    window.selectTheme = function (id) {
        appearance.theme = id;
        save("calibre.reader.theme", id);
        applyPreferences();
    };

    window.selectFont = function (id) {
        appearance.font = id;
        save("calibre.reader.font", id);
        applyPreferences();
    };

    window.spread = function (id) {
        appearance.oneColumn = id === "nonespread";
        save("calibre.reader.columns", appearance.oneColumn ? "one" : "auto");
        applyPreferences();
    };

    window.selectAlign = function (id) {
        appearance.textAlign = id.replace("align-", "");
        save("calibre.reader.textAlign", appearance.textAlign);
        applyPreferences();
    };

    function changeFontSize(delta) {
        appearance.fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, appearance.fontSize + delta));
        save("calibre.reader.fontSize", appearance.fontSize);
        applyPreferences();
    }
    document.getElementById("fontSizeDecrease").addEventListener("click", function () { changeFontSize(-FONT_STEP); });
    document.getElementById("fontSizeIncrease").addEventListener("click", function () { changeFontSize(FONT_STEP); });

    (function initShowPages() {
        var checkbox = document.getElementById("showPagesCount");
        var visible = load("calibre.reader.showPages", "true") === "true";
        if (checkbox) {
            checkbox.checked = visible;
            checkbox.addEventListener("change", function () {
                save("calibre.reader.showPages", checkbox.checked);
                pagesDiv.style.visibility = checkbox.checked ? "visible" : "hidden";
            });
        }
    })();

    function applyCustomColor(hex) {
        if (!hex) return;
        if (hex.charAt(0) !== "#") hex = "#" + hex;
        appearance.customColor = hex.slice(0, 7);
        appearance.theme = "customTheme";
        save("calibre.reader.customTheme", appearance.customColor);
        save("calibre.reader.theme", "customTheme");
        applyPreferences();
    }

    (function initPickr() {
        var swatch = document.getElementById("customThemeSwatch");
        function create() {
            if (!window.Pickr) return setTimeout(create, 150);
            try {
                var pickr = Pickr.create({
                    el: "#customThemeSwatch",
                    theme: "classic",
                    default: appearance.customColor,
                    components: { preview: true, opacity: false, hue: true, interaction: { hex: true, input: true, save: true } },
                });
                pickr.on("change", function (color) { applyCustomColor(color.toHEXA().toString()); });
                pickr.on("save", function (color) {
                    applyCustomColor(color.toHEXA().toString());
                    pickr.hide();
                });
                if (swatch) swatch.addEventListener("click", function () { pickr.show(); });
            } catch (e) {
                console.error("Pickr init failed", e);
            }
        }
        create();
    })();

    // ---------------------------------------------------------------------------
    // Start
    // ---------------------------------------------------------------------------

    function showError(message) {
        $loader.hide();
        $("#viewer").empty().append(
            $("<div></div>").css({ padding: "2em", textAlign: "center" }).append(
                $("<p></p>").text(message),
                $("<button type=\"button\"></button>").text(calibre.reloadLabel || "Reload").on("click", function () {
                    window.location.reload();
                })
            )
        );
    }

    function fetchJson(url, attempts) {
        return fetch(url, { credentials: "same-origin" }).then(function (response) {
            if (!response.ok) throw new Error(url + " answered " + response.status);
            return response.json();
        }).catch(function (error) {
            if (attempts > 1) return fetchJson(url, attempts - 1);
            throw error;
        });
    }

    function start() {
        var manifestUrl = new URL(calibre.manifestUrl, window.location.href).href;
        return fetchJson(manifestUrl, 2).then(function (json) {
            var manifest = Readium.Manifest.deserialize(json);
            if (!manifest) throw new Error("manifest not understood");
            manifest.setSelfLink(manifestUrl);
            publication = new Readium.Publication({
                manifest: manifest,
                fetcher: new Readium.HttpFetcher(undefined, manifest.baseURL),
            });
            return publication.positionsFromManifest();
        }).then(function (list) {
            positions = list;
            var meta = publication.metadata;
            var title = meta.title && meta.title.getTranslation ? meta.title.getTranslation("und") : "";
            var authors = meta.authors && meta.authors.items ? meta.authors.items.map(function (a) {
                return a.name && a.name.getTranslation ? a.name.getTranslation("und") : "";
            }).filter(Boolean).join(", ") : "";
            document.title = title + (authors ? " – " + authors : "");
            $bookTitle.text(title);
            $chapterTitle.text(authors);
            $titleSeperator.show();
            rtl = meta.effectiveReadingProgression === "rtl";

            restoreBookmarks();
            renderToc();
            renderBookmarks();
            paintChrome();

            navigator = new Readium.EpubNavigator(
                document.getElementById("viewer"),
                publication,
                {
                    positionChanged: onPositionChanged,
                    frameLoaded: function () { $loader.hide(); },
                    peripheral: function (event) {
                        if (event.type === "calibre_prev") step(-1);
                        else if (event.type === "calibre_next") step(1);
                    },
                },
                positions,
                initialPosition(),
                {
                    preferences: preferences(),
                    defaults: {},
                    keyboardPeripherals: [
                        { type: "calibre_prev", keyCombos: [{ keyCode: 37 }] },
                        { type: "calibre_next", keyCombos: [{ keyCode: 39 }] },
                    ],
                }
            );
            return navigator.load();
        }).then(function () {
            $loader.hide();
        }).catch(function (error) {
            console.error("Failed to load book", error);
            showError(calibre.errorMessage || "The book could not be loaded.");
        });
    }

    start();
})();
