def chunk_text(text, size=1500, overlap=300):
    chunks, idx, start, n = [], 0, 0, len(text)
    while start < n:
        end = min(start + size, n)
        chunks.append({"id": idx, "text": text[start:end], "start": start, "end": end})
        idx += 1
        start = end - overlap
        if start < 0:
            start = 0
    return chunks
