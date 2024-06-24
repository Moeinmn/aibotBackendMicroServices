from langchain_community.document_loaders import DirectoryLoader

loader = DirectoryLoader('./dir')

docs = loader.load()

len(docs)

print(docs)