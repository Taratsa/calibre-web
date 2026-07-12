/* global $, calibre, ePub, screenfull */

var reader;

(function () {
    "use strict";

    // @likecoin/epub-ts is a drop-in replacement for epubjs 0.3.93.
    // The previous bundle (epubjs + EPUBJS.Reader plugin) exposed a global
    // `ePubReader(url, options)` factory that built the entire reader UI
    // (sidebar, TOC, bookmarks, prev/next, fullscreen, settings, ...).
    // @likecoin/epub-ts is library-only, so we reconstruct that factory here
    // against the existing DOM in templates/read.html.

    if (typeof ePub === "undefined") {
        console.error("ePub library not loaded");
        return;
    }

    // ---------------------------------------------------------------------------
    // Book + Rendition
    // ---------------------------------------------------------------------------

    reader = ePub(calibre.bookUrl, {});

    var $viewer = $("#viewer");
    var $main = $("#main");
    var $divider = $("#divider");
    var $loader = $("#loader");
    var $next = $("#next");
    var $prev = $("#prev");
    var $sidebar = $("#sidebar");
    var $panels = $("#panels");
    var $tocView = $("#tocView");
    var $bookmarksView = $("#bookmarksView");
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
    var $bookmarkCount = $(".bookmark");

    var rendition = reader.renderTo("viewer", {
        width: "100%",
        height: "100%",
        ignoreClass: "annotator-hl",
        flow: "paginated",
        manager: "default",
        // Force document.open()/write() over srcdoc (the new lib's default).
        // srcdoc iframes are sandboxed without allow-scripts, which breaks CFI
        // resolution, navigation, and event handling inside the section DOM.
        method: "write",
    });

    var settings = {
        sidebarReflow: false,
        bookmarks: [],
    };

    // Apply saved sidebarReflow preference
    try {
        var savedReflow = localStorage.getItem("calibre.reader.sidebarReflow");
        if (savedReflow !== null) settings.sidebarReflow = savedReflow === "true";
        var $reflowCheckbox = $("#sidebarReflow");
        if ($reflowCheckbox && $reflowCheckbox.length) {
            $reflowCheckbox.prop("checked", settings.sidebarReflow);
        }
    } catch (e) {}

    // ---------------------------------------------------------------------------
    // Theme registration
    // ---------------------------------------------------------------------------

    Object.keys(window.themes).forEach(function (theme) {
        try {
            var entry = window.themes[theme];
            if (entry && entry.css_path) {
                rendition.themes.register(theme, entry.css_path);
            } else if (entry && entry.bgColor) {
                var cssObj = { "body": { "background": entry.bgColor } };
                if (entry["title-color"]) cssObj.body.color = entry["title-color"];
                rendition.themes.register(theme, cssObj);
            }
        } catch (e) {
            console.error("Failed to register theme " + theme, e);
        }
    });

    // ---------------------------------------------------------------------------
    // Display
    // ---------------------------------------------------------------------------

    if (calibre.bookmark && calibre.bookmark.length > 0) {
        rendition.display(calibre.bookmark);
    } else {
        rendition.display();
    }

    // ---------------------------------------------------------------------------
    // ReaderController: prev/next + keyboard + loader + RTL
    // ---------------------------------------------------------------------------

    var sidebarOpen = false;
    var activePanel = "Toc";

    function slideOut() {
        if (settings.sidebarReflow) {
            $main.removeClass("single").one("transitionend", function () {
                try { rendition.resize(); } catch (e) {}
            });
        } else {
            $main.removeClass("closed");
        }
    }

    function slideIn() {
        if (settings.sidebarReflow) {
            $main.addClass("single").one("transitionend", function () {
                try { rendition.resize(); } catch (e) {}
            });
        } else {
            $main.addClass("closed");
        }
    }

    function showLoader() {
        $loader.show();
        $divider.removeClass("show");
    }

    function hideLoader() {
        $loader.hide();
    }

    function showDivider() {
        $divider.addClass("show");
    }

    function hideDivider() {
        $divider.removeClass("show");
    }

    function goNext() {
        try {
            if (reader.package.metadata.direction === "rtl") {
                rendition.prev();
            } else {
                rendition.next();
            }
        } catch (e) {}
    }

    function goPrev() {
        try {
            if (reader.package.metadata.direction === "rtl") {
                rendition.next();
            } else {
                rendition.prev();
            }
        } catch (e) {}
    }

    $next.on("click", function (e) {
        e.preventDefault();
        goNext();
    });

    $prev.on("click", function (e) {
        e.preventDefault();
        goPrev();
    });

    document.addEventListener("keydown", function arrowKeys(e) {
        if (e.keyCode === 37) {
            if (reader.package.metadata.direction === "rtl") {
                goNext();
            } else {
                goPrev();
            }
            $prev.addClass("active");
            setTimeout(function () { $prev.removeClass("active"); }, 100);
            e.preventDefault();
        } else if (e.keyCode === 39) {
            if (reader.package.metadata.direction === "rtl") {
                goPrev();
            } else {
                goNext();
            }
            $next.addClass("active");
            setTimeout(function () { $next.removeClass("active"); }, 100);
            e.preventDefault();
        }
    }, false);

    rendition.on("layout", function (layout) {
        if (layout.spread === true) {
            showDivider();
        } else {
            hideDivider();
        }
    });

    // ---------------------------------------------------------------------------
    // SidebarController: open/close + tab switching
    // ---------------------------------------------------------------------------

    function showSidebar() {
        sidebarOpen = true;
        slideOut();
        $sidebar.addClass("open");
        $slider.addClass("icon-right").removeClass("icon-menu");
    }

    function hideSidebar() {
        sidebarOpen = false;
        slideIn();
        $sidebar.removeClass("open");
        $slider.addClass("icon-menu").removeClass("icon-right");
    }

    function changePanelTo(panel) {
        var current = activePanel + "Controller";
        if (panel !== activePanel && typeof controllers[panel + "Controller"] !== "undefined") {
            if (controllers[activePanel + "Controller"] && controllers[activePanel + "Controller"].hide) {
                controllers[activePanel + "Controller"].hide();
            }
            controllers[panel + "Controller"].show();
            activePanel = panel;
            $panels.find(".active").removeClass("active");
            $panels.find("#show-" + panel).addClass("active");
        }
    }

    var controllers = {};

    $slider.on("click", function (e) {
        e.preventDefault();
        if (sidebarOpen) {
            hideSidebar();
        } else {
            showSidebar();
        }
    });

    $panels.find(".show_view").on("click", function (e) {
        e.preventDefault();
        var panel = $(this).data("view");
        changePanelTo(panel);
        if (!sidebarOpen) showSidebar();
    });

    // ---------------------------------------------------------------------------
    // ControlsController: slider toggle, fullscreen, settings, bookmark
    // ---------------------------------------------------------------------------

    if (typeof screenfull !== "undefined") {
        $fullscreenBtn.on("click", function () {
            try { screenfull.toggle($("#container")[0] || document.documentElement); } catch (e) {}
        });
        if (screenfull.raw && screenfull.raw.fullscreenchange) {
            document.addEventListener(screenfull.raw.fullscreenchange, function () {
                try {
                    var isFs = screenfull.isFullscreen;
                    if (isFs) {
                        $fullscreenBtn.addClass("icon-resize-small").removeClass("icon-resize-full");
                    } else {
                        $fullscreenBtn.addClass("icon-resize-full").removeClass("icon-resize-small");
                    }
                } catch (e) {}
            });
        }
    }

    $settingBtn.on("click", function () {
        $settingsModal.addClass("md-show");
    });

    $settingsModal.find(".closer").on("click", function () {
        $settingsModal.removeClass("md-show");
    });

    $overlay.on("click", function () {
        $settingsModal.removeClass("md-show");
    });

    var $sidebarReflowCheckbox = $("#sidebarReflow");
    if ($sidebarReflowCheckbox && $sidebarReflowCheckbox.length) {
        $sidebarReflowCheckbox.on("click", function () {
            settings.sidebarReflow = $sidebarReflowCheckbox.prop("checked");
            try { localStorage.setItem("calibre.reader.sidebarReflow", String(settings.sidebarReflow)); } catch (e) {}
        });
    }

    function isBookmarked(cfi) {
        if (!settings.bookmarks) return -1;
        return settings.bookmarks.indexOf(cfi);
    }

    function addBookmarkToList(cfi) {
        if (!settings.bookmarks) settings.bookmarks = [];
        if (settings.bookmarks.indexOf(cfi) === -1) {
            settings.bookmarks.push(cfi);
        }
        var $li = $("<li></li>");
        $li.attr("id", "bookmark-" + cfi.replace(/[^a-zA-Z0-9]/g, "_"));
        $li.addClass("list_item");
        var $a = $("<a></a>");
        // Try to use TOC label if we can find the section
        var label = cfi;
        try {
            var section = reader.spine.get(cfi);
            var tocItem = reader.navigation && reader.navigation.toc && reader.navigation.toc[section.index];
            if (tocItem) label = tocItem.label;
        } catch (e) {}
        $a.text(label);
        $a.attr("href", cfi);
        $a.addClass("bookmark_link");
        $a.on("click", function (ev) {
            ev.preventDefault();
            try { rendition.display($(this).attr("href")); } catch (e) {}
        });
        $li.append($a);
        $bookmarksList.append($li);
    }

    function removeBookmarkFromList(cfi) {
        if (settings.bookmarks) {
            settings.bookmarks = settings.bookmarks.filter(function (b) { return b !== cfi; });
        }
        $("#bookmark-" + cfi.replace(/[^a-zA-Z0-9]/g, "_")).remove();
    }

    function addBookmark(cfi) {
        addBookmarkToList(cfi);
        updateBookmark("add", cfi);
        reader.emit("reader:bookmarked", cfi);
    }

    function removeBookmark(cfi) {
        removeBookmarkFromList(cfi);
        updateBookmark("remove", cfi);
        reader.emit("reader:unbookmarked", cfi);
    }

    $bookmarkBtn.on("click", function () {
        var cfi;
        try { cfi = rendition.currentLocation().start.cfi; } catch (e) { return; }
        if (isBookmarked(cfi) === -1) {
            addBookmark(cfi);
            $bookmarkBtn.addClass("icon-bookmark").removeClass("icon-bookmark-empty");
        } else {
            removeBookmark(cfi);
            $bookmarkBtn.removeClass("icon-bookmark").addClass("icon-bookmark-empty");
        }
    });

    // Sync bookmark button + history hash on relocated
    rendition.on("relocated", function (location) {
        var cfi = location.start.cfi;
        var hash = "#" + cfi;
        if (isBookmarked(cfi) === -1) {
            $bookmarkBtn.removeClass("icon-bookmark").addClass("icon-bookmark-empty");
        } else {
            $bookmarkBtn.addClass("icon-bookmark").removeClass("icon-bookmark-empty");
        }
        if (window.location.hash !== hash) {
            try { history.pushState({}, "", hash); } catch (e) {}
        }
        // Disable prev/next at edges
        if (location.atStart) $prev.addClass("disabled");
        else $prev.removeClass("disabled");
        if (location.atEnd) $next.addClass("disabled");
        else $next.removeClass("disabled");
    });

    window.addEventListener("hashchange", function () {
        var hash = window.location.hash.slice(1);
        if (hash && hash.length > 0) {
            try { rendition.display(hash); } catch (e) {}
        }
    });

    // ---------------------------------------------------------------------------
    // Bookmark DB sync (was on("reader:bookmarked") in original)
    // ---------------------------------------------------------------------------

    function updateBookmark(action, location) {
        var csrftoken = $("input[name='csrf_token']").val();
        $.ajax(calibre.bookmarkUrl, {
            method: "post",
            data: { bookmark: location || "" },
            headers: { "X-CSRFToken": csrftoken },
        }).fail(function (xhr, status, error) {
            console.error("bookmark save failed", error);
        });
    }

    if (calibre.useBookmarks) {
        reader.on("reader:bookmarked", updateBookmark.bind(reader, "add"));
        reader.on("reader:unbookmarked", updateBookmark.bind(reader, "remove"));
    } else {
        $bookmarkBtn.remove();
        $("#show-Bookmarks").remove();
    }

    // ---------------------------------------------------------------------------
    // TocController
    // ---------------------------------------------------------------------------

    function renderToc(toc) {
        $tocView.empty();
        var $root = renderTocList(toc, 1);
        $tocView.append($root);
        $tocView.find(".toc_link").on("click", function (e) {
            e.preventDefault();
            var href = $(this).attr("href");
            try { rendition.display(href); } catch (err) {}
            $tocView.find(".currentChapter").addClass("openChapter").removeClass("currentChapter");
            $(this).parent("li").addClass("currentChapter");
        });
        $tocView.find(".toc_toggle").on("click", function (e) {
            e.preventDefault();
            var $li = $(this).parent("li");
            $li.toggleClass("openChapter");
        });
    }

    function renderTocList(items, depth) {
        var $ul = $("<ul></ul>");
        items.forEach(function (item) {
            var $li = $("<li></li>");
            $li.attr("id", "toc-" + item.id);
            $li.addClass("list_item");
            if (item.subitems && item.subitems.length > 0) {
                var $toggle = $("<a></a>");
                $toggle.addClass("toc_toggle");
                $li.append($toggle);
            }
            var $a = $("<a></a>");
            $a.text(item.label);
            $a.attr("href", item.href);
            $a.addClass("toc_link");
            $li.append($a);
            if (item.subitems && item.subitems.length > 0) {
                $li.append(renderTocList(item.subitems, depth + 1));
            }
            $ul.append($li);
        });
        return $ul;
    }

    function highlightCurrentChapterToc(section) {
        // Walk spine until we find a TOC item matching this section
        var toc = reader.navigation && reader.navigation.toc;
        if (!toc) return;
        function find(items, id) {
            for (var i = 0; i < items.length; i++) {
                if (items[i].id === id) return items[i];
                if (items[i].subitems) {
                    var f = find(items[i].subitems, id);
                    if (f) return f;
                }
            }
            return null;
        }
        if (section && section.idref) {
            var match = find(toc, section.idref);
            if (match) {
                $tocView.find(".currentChapter").removeClass("currentChapter");
                var $li = $("#toc-" + match.id);
                if ($li.length) {
                    $li.addClass("currentChapter");
                    $li.parents("li").addClass("openChapter");
                }
            }
        }
    }

    controllers.TocController = {
        show: function () { $tocView.show(); },
        hide: function () { $tocView.hide(); },
    };

    // ---------------------------------------------------------------------------
    // BookmarksController
    // ---------------------------------------------------------------------------

    controllers.BookmarksController = {
        show: function () { $bookmarksView.show(); },
        hide: function () { $bookmarksView.hide(); },
    };

    // ---------------------------------------------------------------------------
    // MetaController
    // ---------------------------------------------------------------------------

    controllers.MetaController = {
        show: function () {},
        hide: function () {},
    };

    // ---------------------------------------------------------------------------
    // NotesController (stub, original was a no-op for our config)
    // ---------------------------------------------------------------------------

    controllers.NotesController = {
        show: function () {},
        hide: function () {},
    };

    // ---------------------------------------------------------------------------
    // SettingsController: modal already wired in ControlsController section
    // ---------------------------------------------------------------------------

    controllers.SettingsController = {
        show: function () { $settingsModal.addClass("md-show"); },
        hide: function () { $settingsModal.removeClass("md-show"); },
    };

    // ---------------------------------------------------------------------------
    // Touch swipe support (preserved from original)
    //
    // epubjs used to forward DOM events (touchstart/touchend/...) from each
    // section's iframe contents up to the rendition. @likecoin/epub-ts only
    // re-emits them on the Contents instance, so we attach the listeners
    // via the "content" hook (fires after each section is loaded into the
    // viewer).
    // ---------------------------------------------------------------------------

    var touchStart = 0;
    var touchEnd = 0;
    var directionRtl = false;

    function handleTouchStart(event) {
        if (event.changedTouches && event.changedTouches[0]) {
            touchStart = event.changedTouches[0].screenX;
        }
    }

    function handleTouchEnd(event) {
        if (!event.changedTouches || !event.changedTouches[0]) return;
        touchEnd = event.changedTouches[0].screenX;
        if (touchStart < touchEnd) {
            directionRtl ? rendition.next() : rendition.prev();
        } else if (touchStart > touchEnd) {
            directionRtl ? rendition.prev() : rendition.next();
        }
    }

    rendition.hooks.content.register(function (contents) {
        try {
            var win = contents && contents.window;
            if (!win) return;
            win.addEventListener("touchstart", handleTouchStart);
            win.addEventListener("touchend", handleTouchEnd);
        } catch (e) {
            // Cross-origin or unavailable — skip silently.
        }
    });

    // ---------------------------------------------------------------------------
    // Init when book is ready
    // ---------------------------------------------------------------------------

    reader.ready.then(function () {
        hideLoader();

        // MetaController: title + chapter title
        var meta = reader.package.metadata;
        if (meta) {
            document.title = (meta.title || "") + " – " + (meta.creator || "");
            $bookTitle.text(meta.title || "");
            $chapterTitle.text(meta.creator || "");
            if ($titleSeperator && $titleSeperator.length) $titleSeperator.show();
            directionRtl = meta.direction === "rtl";
        }

        // TocController
        var nav = reader.navigation;
        if (nav && nav.toc) {
            renderToc(nav.toc);
        }

        // Highlight chapter on render
        rendition.on("rendered", function (section) {
            highlightCurrentChapterToc(section);
        });

        // Seed bookmarks list with any persisted ones (initial CFI on load)
        if (settings.bookmarks && settings.bookmarks.length) {
            settings.bookmarks.forEach(function (cfi) {
                addBookmarkToList(cfi);
            });
        }

        // Locations (page count + percentage)
        var progressDiv = document.getElementById("progress");
        var pagesDiv = document.getElementById("pages-count");

        try {
            var pref = localStorage.getItem("calibre.reader.showPages");
            var show = pref === null ? true : pref === "true";
            if (pagesDiv) pagesDiv.style.visibility = show ? "visible" : "hidden";
        } catch (e) {}

        var locationsKey = reader.key() + "-locations";
        var positionKey = "calibre.reader.position." + reader.key();
        var storedLocations = localStorage.getItem(locationsKey);
        var makeLocations, saveLocations;
        if (storedLocations) {
            makeLocations = Promise.resolve(reader.locations.load(storedLocations));
            saveLocations = function () {};
        } else {
            makeLocations = reader.locations.generate();
            saveLocations = function () {
                localStorage.setItem(locationsKey, reader.locations.save());
            };
        }
        makeLocations
            .then(function () {
                // Try to restore last position (CFI) from localStorage if present
                try {
                    var savedPos = localStorage.getItem(positionKey);
                    if (savedPos) {
                        try {
                            var posObj = JSON.parse(savedPos);
                            if (posObj && posObj.cfi) {
                                try { rendition.display(posObj.cfi); } catch (e) {}
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                rendition.on("relocated", function (location) {
                    var percentage = Math.round(location.end.percentage * 100);
                    if (progressDiv) progressDiv.textContent = percentage + "%";

                    try {
                        var cfi = location.start.cfi;
                        var current = reader.locations.locationFromCfi(cfi) || 0;
                        var total = reader.locations.length() || 0;
                        if (total > 0 && pagesDiv) {
                            pagesDiv.textContent = current + "/" + total;
                            pagesDiv.style.visibility = "visible";
                        } else if (pagesDiv) {
                            pagesDiv.textContent = "";
                            pagesDiv.style.visibility = "hidden";
                        }
                    } catch (e) {}

                    try {
                        var posObj = {
                            cfi: location.start.cfi,
                            percentage: location.start.percentage,
                        };
                        localStorage.setItem(positionKey, JSON.stringify(posObj));
                    } catch (e) {}
                });
                rendition.reportLocation();
                if (progressDiv) progressDiv.style.visibility = "visible";
            })
            .then(saveLocations);

        // Restore saved font and font size after reader is ready
        try {
            var savedFontSize = localStorage.getItem("calibre.reader.fontSize");
            if (savedFontSize) {
                rendition.themes.fontSize(savedFontSize + "%");
            }

            var savedFont = localStorage.getItem("calibre.reader.font");
            if (savedFont && typeof window.selectFont === "function") {
                window.selectFont(savedFont);
            }
        } catch (e) {}

        // Initial theme application (run after a tick so inline selectTheme() can run)
        var theme = localStorage.getItem("calibre.reader.theme") || "lightTheme";
        if (typeof window.selectTheme === "function") {
            window.selectTheme(theme);
        }
    }).catch(function (err) {
        console.error("Failed to load book", err);
        hideLoader();
    });

    // Window unload: persist locations
    window.addEventListener("beforeunload", function () {
        try {
            if (reader && reader.locations && reader.locations.length && reader.locations.length() > 0) {
                localStorage.setItem(reader.key() + "-locations", reader.locations.save());
            }
        } catch (e) {}
    });
})();