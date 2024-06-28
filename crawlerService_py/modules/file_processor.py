import asyncio
import os
from langchain_community.document_loaders import UnstructuredPDFLoader

# https://medium.com/@varsha.rainer/document-loaders-in-langchain-7c2db9851123

from langchain_community.document_loaders import DirectoryLoader
from utils import recursive_char_splitter


async def load_documents(file_type):
    glob_pattern = f"**/*.{file_type}"
    loader = DirectoryLoader(os.path.join(os.getcwd(), "dir"), glob=glob_pattern, silent_errors=True)
    docs = loader.load()
    return docs if len(docs) != 0 else None


async def handle_md_files():
    md_docs = await load_documents("md")
    chunked_md = []
    return md_docs


async def handle_other_files():
    file_types = ['txt', 'doc', 'docx', 'pdf']
    tasks = [load_documents(file_type) for file_type in file_types]
    result_docs = await asyncio.gather(*tasks)
    flat_result_docs_without_none = [item for doc in result_docs if doc is not None for item in doc]
    splited_chunks = recursive_char_splitter(flat_result_docs_without_none)
    return splited_chunks


async def handle_files_datasource(files):
    tasks = [handle_md_files(), handle_other_files()]
    all_chunks = await asyncio.gather(*tasks)
    all_chunks_flat = [item for sublist in all_chunks for item in sublist]
    print(f"Processed files: {files}")
    print(f"Processed files chunks: {all_chunks}")
    return all_chunks_flat
