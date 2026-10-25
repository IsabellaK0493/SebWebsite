#!/usr/bin/env python3
"""Build full HTML documents for the ClickFunnels custom-HTML pages.

ClickFunnels serves these verbatim and will only accept a whole document, so
each page is the real site page with:
  - the stylesheet and script inlined (no relative files to fetch)
  - photos and videos pointed at the GitHub Pages copies
  - links between pages pointed at the ClickFunnels step paths
  - the ClickFunnels SDK script and that page's token kept in the head

    python3 make-clickfunnels-pages.py
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "edinburgh-hiking")
OUT = os.path.join(ROOT, "clickfunnels-pages")
BASE = "https://isabellak0493.github.io/SebWebsite/edinburgh-hiking/"

# site file -> (ClickFunnels path, page id, page token)
PAGES = {
    "index.html":            ("/home",                     25636446, "cfp_TQmYqRv14Kpy9SwvyQRVaz6Z"),
    "tours.html":            ("/tours",                    25636447, "cfp_KU9vDCVqo1w7eUV1sur5Otlt"),
    "tour-pentlands.html":   ("/pentland-hills",           25636448, "cfp_9kGyUDtf254jejGWAOMkNs3c"),
    "tour-hermitage.html":   ("/hermitage-blackford-hill", 25636449, "cfp_sqq9rx0pWmIBQnaWni8jw3CB"),
    "tour-arthurs-seat.html":("/arthurs-seat",             25636450, "cfp_BrlNYqncOXKkkMka1oYqiD6A"),
    "about.html":            ("/about",                    25636451, "cfp_YNKEaAyUdw34gbaXUdPKB11b"),
    "contact.html":          ("/contact",                  25636452, "cfp_AA6h2eI6rDvmoYx58o218LiL"),
    # The FAQ step has not been made in ClickFunnels yet, so it carries no
    # token. Add its id and token here once the step exists and rebuild.
    "faq.html":              ("/faq",                      None,     None),
}
SDK = '<script src="https://sdk.myclickfunnels.com/sdk.js" defer></script>'


def read(*p):
    with open(os.path.join(SITE, *p), encoding="utf-8") as f:
        return f.read()


def squeeze_css(css):
    """Strip comments and run-on whitespace. Keeps every rule intact."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s*\n\s*", "", css)
    css = re.sub(r"[ \t]{2,}", " ", css)
    return css.strip()


def build(page):
    cf_path, _id, token = PAGES[page]
    s = read(page)

    # assets -> the hosted copies
    s = re.sub(r'(?<=["\'(])assets/', BASE + "assets/", s)

    # links between pages -> ClickFunnels step paths
    def link(m):
        t = m.group(1)
        if t in PAGES:
            return 'href="%s"' % PAGES[t][0]
        # anything not yet a ClickFunnels step points at the hosted copy, so a
        # link is never left relative and broken
        return 'href="%s%s"' % (BASE, t)
    s = re.sub(r'href="([a-z0-9-]+\.html)"', link, s)

    # The stylesheet and script stay as links to the hosted copies rather than
    # being inlined: it keeps each page ~56 KB smaller, and a change to the
    # site's CSS or JS then reaches these pages without re-pasting them.

    # ClickFunnels page token + SDK, and no canonical pointing elsewhere
    s = re.sub(r'\n<link rel="canonical"[^>]*>', '', s)
    head = ('<meta name="cf-page-token" content="%s">\n%s\n</head>' % (token, SDK)
            if token else '%s\n</head>' % SDK)
    s = s.replace("</head>", head)
    return s


def main():
    os.makedirs(OUT, exist_ok=True)
    for page in PAGES:
        html = build(page)
        name = PAGES[page][0].strip("/") + ".html"
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(html)
        left = len(re.findall(r'(?<!:)//[^"]*assets/', html))
        print("  %-26s -> %-28s %6.0f KB   relative assets left: %d"
              % (page, name, len(html) / 1024, html.count('"assets/')))


if __name__ == "__main__":
    main()
