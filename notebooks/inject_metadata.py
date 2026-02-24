'''Script to inject metadata (title, description, author, favicon) into case_study.html.'''

from bs4 import BeautifulSoup

fn_in = '../docs/case_study.html'
fn_out = fn_in  # overwrite original file

# Load metadata you want to insert
meta = {
    'title': 'Capital Crashpad: Platform Governance and Airbnb in Washington, DC',
    'description': 'Case study analyzing the impact of Airbnb’s 2024 verification expansion on Washington, D.C.’s short-term rental market.',
    'author': 'Bryan C. Johns',
    'favicon': 'static/images/favicon.ico'
}

with open(fn_in, 'r', encoding='utf8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
if soup.head is None:
    soup.html.insert(0, soup.new_tag('head'))

# Insert/replace title
if soup.head.title:
    soup.head.title.string = meta['title']
else:
    t = soup.new_tag('title')
    t.string = meta['title']
    soup.head.insert(0, t)

# Add description and author meta tags (ensure only single instance)
for name in ('description', 'author'):
    tag = soup.head.find('meta', attrs={'name': name})
    if tag:
        tag['content'] = meta[name]
    else:
        tag = soup.new_tag('meta', attrs={'name': name, 'content': meta[name]})
        soup.head.append(tag)

# Add favicon
link = soup.head.find('link', rel='icon')
if link:
    link['href'] = meta['favicon']
else:
    link_tag = soup.new_tag('link', attrs={'rel': 'icon', 'href': meta['favicon'], 'type': "image/x-icon"})
    soup.head.append(link_tag)

with open(fn_out, 'w', encoding='utf8') as f:
    f.write(str(soup))

print('Wrote', fn_out)