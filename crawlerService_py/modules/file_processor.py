from langchain_community.document_loaders import UnstructuredPDFLoader


loader = UnstructuredPDFLoader("example_data/layout-parser-paper.pdf")

data = loader.load()