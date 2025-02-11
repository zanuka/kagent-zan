import os
import hashlib
import asyncio
from urllib.parse import urljoin, urlparse
import aiohttp
from bs4 import BeautifulSoup
import markdown2
from playwright.async_api import async_playwright
from readability import Document
import bleach

OUTPUT_DIR = os.path.join(os.getcwd(), 'out')

def normalize_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    except Exception:
        return url

class WebCrawler:
    def __init__(self):
        self.visited_urls = set()
        self.page_contents = {}
        
    async def process_page(self, url: str) -> str:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until='domcontentloaded')
                html_content = await page.evaluate('() => document.querySelector("main") ? document.querySelector("main").innerHTML : document.body.innerHTML')
                
                # Extract content using readability
                doc = Document(html_content)
                article = doc.summary()
                if not article:
                    raise ValueError("Failed to parse article content")

                # Sanitize HTML
                allowed_tags = [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol',
                    'li', 'b', 'i', 'strong', 'em', 'code', 'pre',
                    'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
                ]
                allowed_attrs = {
                    'a': ['href'],
                    'pre': ['class', 'data-language'],
                    'code': ['class', 'data-language'],
                    'div': ['class'],
                    'span': ['class']
                }
                
                clean_html = bleach.clean(
                    article,
                    tags=allowed_tags,
                    attributes=allowed_attrs,
                    strip=True
                )

                # Convert to markdown
                markdown = markdown2.markdown(
                    clean_html,
                    extras=['fenced-code-blocks', 'tables']
                )
                
                return markdown

            finally:
                await browser.close()

    async def crawl_website(self, base_url: str, crawl_path: str):
        queue = [f"{base_url}{crawl_path}"]
        
        async with aiohttp.ClientSession() as session:
            while queue:
                url = queue.pop(0)
                normalized_url = normalize_url(url)
                
                if normalized_url in self.visited_urls:
                    continue

                try:
                    async with session.get(url) as response:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        main_content = soup.find('article') or soup.find('body')
                        content_hash = hashlib.sha256(main_content.text.encode()).hexdigest()

                        # Check for duplicate content
                        if any(content_hash == existing_hash 
                              for existing_hash in self.page_contents.values()):
                            print(f"Skipping {url} - duplicate content")
                            continue

                        self.page_contents[normalized_url] = content_hash
                        self.visited_urls.add(normalized_url)
                        
                        print(f"Processing: {url}")
                        
                        # Process page with retries
                        content = None
                        max_attempts = 3
                        for attempt in range(max_attempts):
                            try:
                                content = await self.process_page(url)
                                break
                            except Exception as e:
                                print(f"Attempt {attempt + 1} failed: {str(e)}")
                                if attempt == max_attempts - 1:
                                    raise

                        if not content:
                            raise ValueError(f"Failed to get content for {url}")

                        # Save content
                        relative_path = url.replace(base_url, '').lstrip('/')
                        output_dir = os.path.join(OUTPUT_DIR, os.path.dirname(relative_path))
                        output_file = os.path.join(
                            output_dir,
                            f"{os.path.splitext(os.path.basename(relative_path))[0]}.md"
                        )
                        print(f"Saving: {url} in {output_dir}")
                        
                        os.makedirs(output_dir, exist_ok=True)
                        with open(output_file, 'w', encoding='utf-8') as f:
                            f.write(content)

                        # Process links
                        for link in soup.find_all('a', href=True):
                            href = link['href']
                            if href.startswith('#') or href.startswith('mailto:'):
                                continue
                                
                            try:
                                full_url = urljoin(base_url, href)
                                if (full_url.startswith(base_url) and
                                    crawl_path in full_url and
                                    normalize_url(full_url) not in self.visited_urls):
                                    queue.append(full_url)
                            except Exception as e:
                                print(f"Invalid URL {href}: {str(e)}")

                except Exception as e:
                    print(f"Failed to process {url}: {str(e)}")

async def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    elif os.listdir(OUTPUT_DIR):
        raise ValueError(f"Output directory {OUTPUT_DIR} is not empty")
        
    import sys
    if len(sys.argv) != 2:
        print("Please provide a URL to crawl")
        sys.exit(1)
        
    url = sys.argv[1]
    parsed_url = urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    path = parsed_url.path
    
    crawler = WebCrawler()
    await crawler.crawl_website(base_url, path)

if __name__ == "__main__":
    asyncio.run(main())