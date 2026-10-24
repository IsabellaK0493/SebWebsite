#!/usr/bin/env python3
"""Turn each page of the Edinburgh Hiking site into one block of HTML that can
be pasted into a Systeme.io custom-HTML element.

A Systeme.io page cannot reference local files, so each block carries the
stylesheet and script inside it, and every photo, video and link points at the
copy hosted on GitHub Pages.

    python3 make-systeme-pages.py

Writes systeme-paste/<page>.html. Re-run it after changing the site.
"""
import os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "edinburgh-hiking")
OUT = os.path.join(ROOT, "systeme-paste")

# Where the assets live once GitHub Pages is switched on for this repo.
# SYSTEME_BASE overrides it, which is how the output gets tested locally.
BASE = os.environ.get("SYSTEME_BASE",
                      "https://isabellak0493.github.io/SebWebsite/edinburgh-hiking/")

FONTS = ("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300..800"
         "&family=Montserrat:wght@300..700&family=Young+Serif&display=swap")

PAGES = {
    "index.html": "Home",
    "tours.html": "Tours",
    "tour-pentlands.html": "The Pentland Hills",
    "tour-hermitage.html": "Hermitage & Blackford Hill",
    "tour-arthurs-seat.html": "Arthur's Seat",
    "about.html": "About",
    "contact.html": "Contact",
    "faq.html": "FAQs",
}


def read(*parts):
    with open(os.path.join(SITE, *parts), encoding="utf-8") as f:
        return f.read()


def systeme_urls():
    """Read systeme-urls.txt: page name -> the page's address in Systeme.io.

    Pages left blank keep pointing at the GitHub Pages copy, so the file can
    be filled in a page at a time.
    """
    path = os.path.join(ROOT, "systeme-urls.txt")
    urls = {}
    if not os.path.exists(path):
        return urls
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if "=" not in line:
                continue
            name, _, url = line.partition("=")
            name, url = name.strip(), url.strip()
            if name and url:
                urls[name + ".html"] = url
    return urls


def absolutise(markup, urls):
    """Point assets at GitHub Pages, and page links at Systeme where known."""
    # assets/... in src, href, srcset and inline styles
    markup = re.sub(r'(?<=["\'(])assets/', BASE + "assets/", markup)

    # links between pages: a Systeme address if given, else the hosted copy
    def page_link(m):
        target = m.group(1)
        if target in urls:
            return 'href="%s"' % urls[target]
        return 'href="%s%s"' % (BASE, target) if target in PAGES else m.group(0)
    markup = re.sub(r'href="([a-z0-9-]+\.html)"', page_link, markup)
    return markup


def body_of(markup):
    m = re.search(r"<body[^>]*>(.*)</body>", markup, re.S)
    body = m.group(1).strip() if m else markup
    # The script is inlined at the end of the block, so drop the <script src>
    # the page carries, or it loads twice and every control gets two listeners.
    return re.sub(r'\s*<script[^>]+src="[^"]*app\.js"[^>]*>\s*</script>', "", body)


# Builders do not always serve a pasted block as UTF-8, and a page read as
# Western text turns "->" into mojibake ("ABOUT THIS TOUR ,ui"). Keeping every
# block pure ASCII sidesteps the question: each syntax has its own escape.
def ascii_html(text):
    return "".join(c if ord(c) < 128 else "&#x%X;" % ord(c) for c in text)


def ascii_css(text):
    # "\2014 " - the trailing space ends the escape and is consumed
    return "".join(c if ord(c) < 128 else "\\%X " % ord(c) for c in text)


def contain_css(css):
    """Keep the site's page-level styling inside the pasted block.

    The stylesheet styles `body`, which inside a builder means the builder's
    own page: its background, colour and font all change. Re-aim that rule at
    the block itself.
    """
    return re.sub(r"(?m)^body \{", ".sio-page {", css, count=1)


def ascii_js(text):
    return "".join(c if ord(c) < 128 else "\\u%04X" % ord(c) for c in text)


def main():
    os.makedirs(OUT, exist_ok=True)
    urls = systeme_urls()
    css = ascii_css(contain_css(read("assets", "css", "styles.css")))
    js = ascii_js(read("assets", "js", "app.js"))
    written = []

    # Inside a page builder, the site's fixed header and mobile menu escape the
    # HTML box and cover the editor's own toolbar, making Save and Exit
    # unclickable. A transform on the wrapper makes it the containing block for
    # fixed children, so they stay inside the pasted block instead of the
    # window. The header then scrolls with the page rather than following it
    # down, which is the one behaviour given up for a usable editor.
    CONTAIN = (
        "\n/* keep this block's fixed elements inside the block */\n"
        ".sio-page { position: relative; transform: translateZ(0); isolation: isolate; }\n"
        ".sio-page .site-header { z-index: 5; }\n"
        ".sio-page .sheet { z-index: 6; }\n"
        ".sio-page .skip-link { z-index: 7; }\n"
        "/* The skip link hides by sitting just above the page. Inside a builder\n"
        "   the block starts partway down, so 'above' is still on screen. Park it\n"
        "   off to the side instead, and keep it reachable by keyboard. */\n"
        ".sio-page .skip-link { top: 1rem; left: -9999px; }\n"
        ".sio-page .skip-link:focus { left: 1rem; }\n"
        "/* A builder's own row styling is inherited by whatever is pasted into\n"
        "   it. Two of its habits wreck this layout: centred text, and a\n"
        "   `.row * { box-sizing: content-box }` rule that outranks the site's\n"
        "   own reset and so throws every width out. Restate both here, where\n"
        "   the extra class makes them specific enough to win. */\n"
        ".sio-page, .sio-page *, .sio-page *::before, .sio-page *::after"
        " { box-sizing: border-box; }\n"
        ".sio-page { text-align: left; font-family: var(--font-body);"
        " font-size: 16px; line-height: 1.6; color: var(--ink); }\n"
        ".sio-page img, .sio-page video { max-width: 100%; display: block; }\n"
    )

    for page, title in PAGES.items():
        body = ('<div class="sio-page">\n'
                + ascii_html(absolutise(body_of(read(page)), urls))
                + '\n</div>')
        block = (
            "<!-- Sebastian CN Anderson Hiking - %s\n"
            "     Paste this whole block into one Systeme.io custom HTML element.\n"
            "     Built by make-systeme-pages.py - edit the site, not this file. -->\n"
            "<script>document.documentElement.className += \" js\";</script>\n"
            "<style>\n@import url('%s');\n\n%s\n%s</style>\n\n"
            "%s\n\n<script>\n%s\n</script>\n"
        ) % (title, FONTS, css, CONTAIN, body, js)

        # .txt, not .html: double-clicking an .html file opens it in a browser,
        # which renders the page instead of showing the code there is to copy.
        name = page.replace(".html", "") + ".txt"
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(block)
        written.append((title, name, len(block) / 1024))

    guide = ["HOW TO PASTE THESE INTO SYSTEME.IO", "=" * 34, "",
             "One file per page. Each is a single self-contained block.", "",
             "Before they work, the images must be online:",
             "  1. Sign in to GitHub once (the token step) so the site can upload.",
             "  2. On github.com: SebWebsite > Settings > Pages >",
             "     Source: Deploy from a branch, Branch: main, Folder: / (root) > Save.",
             "  3. Wait a minute, then check this address opens:",
             "     " + BASE + "index.html", "",
             "Then for each page in Systeme.io:",
             "  1. Create a BLANK page (no Systeme header or footer).",
             "  2. Add a 'Custom HTML' / 'Code' element, full width, padding 0.",
             "  3. Double-click the matching file below. It opens in TextEdit.",
             "  4. Press Cmd+A to select all, then Cmd+C to copy.",
             "  5. Click into the Systeme.io HTML box and press Cmd+V.",
             "  6. Save and preview.", "",
             "Files (plain text, so they open ready to copy):"]
    for title, name, kb in written:
        guide.append("  %-28s %-26s %6.0f KB" % (title, name, kb))
    guide += ["", "Notes:",
              "  - Page titles and search-engine descriptions are set in Systeme.io's",
              "    own SEO settings; they are not carried in the paste.",
              "  - The menu links point at the GitHub Pages copies. Once the Systeme",
              "    pages have their own addresses, tell Claude and they can be swapped.",
              "  - Re-run make-systeme-pages.py after any change to the site."]

    with open(os.path.join(OUT, "HOW-TO-PASTE.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(guide) + "\n")

    for title, name, kb in written:
        print("  %-28s %-26s %6.1f KB" % (title, name, kb))
    print("\nwrote %d pages + HOW-TO-PASTE.txt to %s" % (len(written), OUT))


if __name__ == "__main__":
    main()
