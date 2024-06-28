import asyncio
from bs4 import BeautifulSoup as Soup
from langchain_community.document_loaders.recursive_url_loader import RecursiveUrlLoader


async def crawl_and_extract(link):
    try:
        # page = requests.get(link)
        # soup = BeautifulSoup(page.text, 'html.parser')
        # text = soup.get_text(separator='\n', strip=True)
        # print(text)

        loader = RecursiveUrlLoader(
            url=link, max_depth=1, extractor=lambda x: Soup(x, "html.parser").text
        )
        docs = loader.load();

        #chunked_docs = recursive_char_splitter(docs)

        return docs

    except Exception as e:
        print(f"Error crawling {link}: {e}")


async def handle_urls_datasource(urls):
    tasks = []
    for url in urls:
        tasks.append(crawl_and_extract(url))
        print("Now in link:", url)

    all_chunks = await asyncio.gather(*tasks)

    print(f"Processed URLs: {all_chunks}")

    return all_chunks


# def crawl_and_extract(bot_id, links):
#     collection_id = database_instance.create_or_return_collection_uuid(bot_id)
#
#     for link in links:
#         print("Now in link:", link)
#         try:
#             # page = requests.get(link)
#             # soup = BeautifulSoup(page.text, 'html.parser')
#             # text = soup.get_text(separator='\n', strip=True)
#             # print(text)
#
#             loader = RecursiveUrlLoader(
#                 url=link, max_depth=1, extractor=lambda x: Soup(x, "html.parser").text
#             )
#             docs = loader.load();
#
#             chunked_docs = recursive_char_splitter(docs)
#
#             embedded_chunks = create_document_embedding(chunked_docs)
#
#             for index, chunk in enumerate(chunked_docs):
#             database_instance.insert_embedding_record(bot_id=bot_id,
#                                                           content=chunk.page_content,
#                                                           metadata=chunk.metadata,
#                                                           embedding=embedded_chunks[index],
#                                                           collection_id=collection_id
#                                                           )
#
#             print(f"Successfully crawled and extracted from: {link}")
#         except Exception as e:
#             print(f"Error crawling {link}: {e}")
