## Create a vector database for the documentation

1. Setup

```bash
uv pip install aiohttp beautifulsoup4 markdown2 playwright readability-lxml bleach qdrant_client
```

Install playwright:
```bash
playwright install
```

Setup a local db for testing:
```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 -p 6334:6334 \
    -v "$(pwd)/qdrant_storage:/qdrant/storage:z" \
    qdrant/qdrant
```

Qdrant is now accessible with the REST API at localhost:6333. This is what the write script will use by default.

2. Start by crawling the page you want:

```bash
python3 crawl-docs <link-to-page>
```

- `<link-to-page>` - for example https://docs.solo.io/gateway/latest/

This will process the docs and save them locally. Remember to not commit the saved documentation! 

2. Manually validate and cleanup useless files.

The documentation is generated under `tools/docs/out`.

3. Create a vector database out of it:

```bash
  VECTOR_DB=<DB_TYPE> \
  python3 chunk-and-write.py <PRODUCT_NAME> <VERSION> <<DOCS_DIR>
```

- `<DB_PATH>` - The **full path** to the database file. (e.g. ./python/src/kagent/tools/qdrant/istio.db)
- `<DB_TYPE>` - Type of the database. `sqlite` and `qdrant` are supported.
- `<PRODUCT_NAME>` - Name of the product. E.g. `istio`.
- `<VERSION>` - Version of the product. E.g. `1.24`.
- `<PATH_TO_DOCS>`  - Path to the directory containing the documentation. (e.g. ./python/src/kagent/tools/docs/out)

An example command for the istio docs would be:

```
  VECTOR_DB=qdrant \
  python3 chunk-and-write.py istio 1.24
```

In the end, either (a) cleanup or (b) backup the output files
```bash
# cleanup
rm -rf python/src/kagent/tools/qdrant/

# backup
tar -czvf python/src/kagent/tools/qdrant/PRODUCT.tar.gz ~/out # or some other directory outside the repo
```

NOTE: Update the search_documentation definition to be aware of the new database.
