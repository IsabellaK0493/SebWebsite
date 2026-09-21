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
}


def read(*parts):
    with open(os.path.join(SITE, *parts), encoding="utf-8") as f:
        return f.read()


def absolutise(markup):
    """Point assets and page links at the hosted copies."""
    # assets/... in src, href, srcset and inline styles
    markup = re.sub(r'(?<=["\'(])assets/', BASE + "assets/", markup)
    # links between pages: href="tours.html" -> hosted page
    def page_link(m):
        target = m.group(1)
        return 'href="%s%s"' % (BASE, target) if target in PAGES else m.group(0)
    markup = re.sub(r'href="([a-z0-9-]+\.html)"', page_link, markup)
    return markup


def body_of(markup):
    m = re.search(r"<body[^>]*>(.*)</body>", markup, re.S)
    return m.group(1).strip() if m else markup


def main():
    os.makedirs(OUT, exist_ok=True)
    css = read("assets", "css", "styles.css")
    js = read("assets", "js", "app.js")
    written = []

    for page, title in PAGES.items():
        body = absolutise(body_of(read(page)))
        block = (
            "<!-- Sebastian CN Anderson Hiking — %s\n"
            "     Paste this whole block into one Systeme.io custom HTML element.\n"
            "     Built by make-systeme-pages.py — edit the site, not this file. -->\n"
            "<script>document.documentElement.className += \" js\";</script>\n"
            "<style>\n@import url('%s');\n\n%s\n</style>\n\n"
            "%s\n\n<script>\n%s\n</script>\n"
        ) % (title, FONTS, css, body, js)

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
