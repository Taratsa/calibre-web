/* Smart Duplicate Detection & Management - page interactions */
(function ($) {
    "use strict";

    function showInfo(title, body) {
        $("#info_modal_body").html(body);
        $("#InfoModal").modal("show");
    }

    function updateUnresolvedBadge() {
        $.getJSON("/duplicates/status", function (data) {
            if (data && data.success) {
                $("#unresolved_badge").text("Unresolved: " + data.count);
            }
        }).fail(function () {
            /* non-fatal */
        });
    }

    /* Manual scan */
    $("#trigger_scan").on("click", function () {
        var $btn = $(this);
        $btn.prop("disabled", true);
        $.post("/duplicates/trigger-scan")
            .done(function (data) {
                if (data.queued) {
                    var link =
                        '<a href="/tasks">' +
                        (window.Translations && window.Translations.viewTasks
                            ? window.Translations.viewTasks
                            : "View Background Tasks") +
                        "</a>";
                    showInfo("Scan queued", "<p>" + data.message + "</p><p>" + link + "</p>");
                } else {
                    window.location.reload();
                }
            })
            .fail(function (xhr) {
                var msg = xhr.responseJSON ? xhr.responseJSON.message || xhr.responseJSON.error : "Error";
                showInfo("Scan failed", "<p>" + msg + "</p>");
            })
            .always(function () {
                $btn.prop("disabled", false);
            });
    });

    /* Save settings */
    $("#save_settings").on("click", function () {
        var formData = new FormData(document.getElementById("duplicate-settings-form"));
        $.ajax({
            url: "/duplicates/settings",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false
        })
            .done(function (data) {
                showInfo("Settings saved", "<p>" + data.message + "</p>");
                window.setTimeout(function () {
                    window.location.reload();
                }, 800);
            })
            .fail(function (xhr) {
                var msg = xhr.responseJSON ? xhr.responseJSON.error : "Error";
                showInfo("Error", "<p>" + msg + "</p>");
            });
    });

    /* Dismiss a group */
    $(".dup-group").each(function () {
        var $group = $(this);
        $group.find(".dismiss-group").on("click", function () {
            var hash = $group.data("group-hash");
            $.post("/duplicates/dismiss/" + hash)
                .done(function (data) {
                    if (data.success) {
                        $group.fadeOut(function () {
                            $group.remove();
                        });
                        updateUnresolvedBadge();
                    } else {
                        showInfo("Error", "<p>" + (data.error || data.message) + "</p>");
                    }
                })
                .fail(function () {
                    showInfo("Error", "<p>Failed to dismiss group</p>");
                });
        });
    });

    /* Preview resolution */
    $("#preview_resolution").on("click", function () {
        var strategy = $("#resolution_strategy").val();
        $.ajax({
            url: "/duplicates/preview-resolution",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ strategy: strategy })
        })
            .done(function (data) {
                var html = "";
                if (!data.success) {
                    html = "<p class='text-danger'>" + (data.error || "Error") + "</p>";
                } else if (!data.preview || data.preview.length === 0) {
                    html = "<p>No duplicates to resolve.</p>";
                } else {
                    html = "<p>Strategy: <strong>" + strategy + "</strong> - " +
                        data.resolved_count + " group(s), " + data.deleted_count + " book(s) would be removed.</p>";
                    html += "<table class='table table-striped table-condensed'><thead><tr>" +
                        "<th>Group</th><th>Keep</th><th>Remove</th></tr></thead><tbody>";
                    data.preview.forEach(function (g) {
                        var keep = "Book #" + g.kept_book_id + " (" + g.kept_book_timestamp + ")";
                        var formats = (g.kept_book_formats || []).join(", ") || "no formats";
                        var removed = g.deleted_book_ids.map(function (id) {
                            return "Book #" + id;
                        }).join(", ");
                        html += "<tr><td>" + g.title + "</td><td>" + keep +
                            "<br><small>" + formats + "</small></td><td>" + removed + "</td></tr>";
                    });
                    html += "</tbody></table>";
                }
                $("#resolution_preview_body").html(html);
                $("#ResolutionPreviewModal").modal("show");
            })
            .fail(function (xhr) {
                var msg = xhr.responseJSON ? xhr.responseJSON.error : "Error";
                showInfo("Error", "<p>" + msg + "</p>");
            });
    });

    /* Execute resolution */
    $("#execute_resolution").on("click", function () {
        var strategy = $("#resolution_strategy").val();
        $("#confirm_modal_body").html(
            "<p>Execute resolution using strategy <strong>" + strategy + "</strong> on all groups?</p>" +
            "<p class='text-danger'>Books will be backed up and then deleted. This cannot be undone from the UI.</p>"
        );
        $("#confirm_modal_ok").off("click").on("click", function () {
            $("#ConfirmModal").modal("hide");
            $.ajax({
                url: "/duplicates/execute-resolution",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ strategy: strategy })
            })
                .done(function (data) {
                    if (data.success) {
                        var msg = "Resolved " + data.resolved_count + " group(s), removed " +
                            data.deleted_count + " book(s).";
                        showInfo("Resolution complete", "<p>" + msg + "</p>");
                    } else {
                        var errors = (data.errors || []).join("<br>");
                        showInfo("Resolution finished with errors", "<p>" + errors + "</p>");
                    }
                    window.setTimeout(function () {
                        window.location.reload();
                    }, 1200);
                })
                .fail(function (xhr) {
                    var msg = xhr.responseJSON ? xhr.responseJSON.error : "Error";
                    showInfo("Error", "<p>" + msg + "</p>");
                });
        });
        $("#ConfirmModal").modal("show");
    });
})(jQuery);
