/* Clippings editor: debounced server-side Markdown preview (same sanitiser as the public pages). */
(function ($) {
    "use strict";

    var $body = $("#body");
    var $preview = $("#clipping_preview");
    var timer = null;
    var request = null;

    function render() {
        if (request) {
            request.abort();
        }
        request = $.post("/admin/clippings/preview", {
            csrf_token: $("input[name='csrf_token']").val(),
            body: $body.val()
        })
            .done(function (data) {
                $preview.html(data.html);
            })
            .fail(function (xhr, status) {
                if (status !== "abort") {
                    $preview.text("Preview failed (" + xhr.status + ")");
                }
            });
    }

    $body.on("input", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(render, 400);
    });
    render();
})(jQuery);
