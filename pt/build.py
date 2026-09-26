"""Builds workshops.html and contact.html from the home page's header and footer.

Edit index.html's header/footer, or _parts/*.main.html, then run: python3 build.py
"""
import pathlib, re

root = pathlib.Path(__file__).parent
home = (root / "index.html").read_text()
head = home[: home.index('<main id="main">')]
foot = home[home.index("</main>") + len("</main>"):]

pages = {
    "workshops": ("Workshops &amp; Corporate | Sebastian C N Anderson",
                  "Workshops, talks and team training on strength, flexibility and running for workplaces, clubs and events in Edinburgh.",
                  "workshops.html"),
    "contact": ("Contact | Sebastian C N Anderson",
                "Book a free personal training consultation in Edinburgh, email Sebastian, or join the newsletter.",
                "contact.html"),
}

for name, (title, desc, href) in pages.items():
    h = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head)
    h = re.sub(r'(<meta name="description" content=")[^"]*', rf"\g<1>{desc}", h)
    h = h.replace('<link rel="canonical" href="https://www.sebastiancnanderson.com/">',
                  f'<link rel="canonical" href="https://www.sebastiancnanderson.com/{href}">')
    # mark the current tab
    h = h.replace(f'<a href="{href}">', f'<a href="{href}" aria-current="page">')
    main = (root / "_parts" / f"{name}.main.html").read_text()
    (root / href).write_text(h + main + foot)
    print("built", href)
