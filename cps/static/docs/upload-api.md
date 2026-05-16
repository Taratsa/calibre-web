# Pustaka Taratsa Upload API

API for AI agents to upload files to the Pustaka Taratsa digital library.

## Prerequisites

- AI agent must have an account on Pustaka Taratsa with `upload` role
- Only **PDF** and **EPUB** files are allowed

---

## Step 1: Login

AI agent must login before uploading files.

### Request

```http
POST /login HTTP/1.1
Host: pustaka.taratsa.id
Content-Type: application/x-www-form-urlencoded

username=<USERNAME>&password=<PASSWORD>&remember_me=on
```

### Response

Successful login returns a redirect and session cookie.

**Note:** Save the received cookie for subsequent requests.

---

## Step 2: Upload File

### Request

```http
POST /api/webhook/upload HTTP/1.1
Host: pustaka.taratsa.id
Content-Type: multipart/form-data
Cookie: <SESSION_COOKIE>

------FormBoundary
Content-Disposition: form-data; name="file"; filename="<filename>.<pdf|epub>"
Content-Type: application/pdf (or application/epub+zip)

<BINARY_FILE_DATA>
------FormBoundary--
```

### Python Example

```python
import requests

# Login
session = requests.Session()
login_data = {
    "username": "your_username",
    "password": "your_password",
    "remember_me": "on"
}
session.post("https://pustaka.taratsa.id/login", data=login_data)

# Upload file
with open("book.pdf", "rb") as f:
    files = {"file": f}
    response = session.post("https://pustaka.taratsa.id/api/webhook/upload", files=files)

print(response.json())
```

### Success Response

```json
{
  "book_id": 152,
  "title": "Kliping Hilang",
  "author": "Unknown",
  "description": "Book description...",
  "publisher": "KontraS",
  "series": null,
  "series_id": null,
  "languages": ["Indonesian"],
  "tags": ["Archive", "HAM"],
  "pubdate": "1998-04-11",
  "url": "https://pustaka.taratsa.id/book/152"
}
```

### Error Response

| Status | Error | Cause |
|--------|-------|-------|
| 401 | Authentication required | Not logged in / session expired |
| 403 | Upload permission required | Account lacks upload access |
| 400 | No file provided | No `file` field in request |
| 400 | Only PDF and EPUB files are allowed | Unsupported file format |

---

## Step 3: Use Metadata

The API response contains metadata extracted from the file:

| Field | Description |
|-------|-------------|
| `book_id` | Unique book ID in the system |
| `title` | Book title |
| `author` | Author name |
| `description` | Book description/Synopsis from file |
| `publisher` | Publisher (if available in file metadata) |
| `series` | Series name (if available) |
| `series_id` | Series ID |
| `languages` | List of languages |
| `tags` | List of tags/categories |
| `pubdate` | Publication date |
| `url` | Full URL to book page |

---

## Complete curl Example

### 1. Login

```bash
curl -c cookies.txt -X POST https://pustaka.taratsa.id/login \
  -d "username=agent_user&password=secret&remember_me=on"
```

### 2. Upload

```bash
curl -b cookies.txt -X POST https://pustaka.taratsa.id/api/webhook/upload \
  -F "file=@/path/to/book.pdf"
```

### 3. Verify

Open the URL returned in the response to verify the book was uploaded correctly.

---

## Important Notes

1. **Metadata is extracted automatically** from PDF/EPUB file - no manual entry needed
2. **Cover is extracted automatically** if available in the file
3. **Session expires** - if upload fails with 401, re-login
4. **File must have an extension** - system rejects files without extension

---

## Troubleshooting

### "Authentication required" (401)
- Ensure login succeeded and cookie was saved
- Try re-login with a fresh session

### "Upload permission required" (403)
- Account needs `upload` role granted by admin

### Upload timeout
- Large files may take longer
- Ensure stable connection

### "Only PDF and EPUB files are allowed"
- Convert file to PDF or EPUB before uploading
- Check file extension is correct (.pdf or .epub)

---

## Check if Book Exists

Before uploading, AI agents should check if the book already exists to avoid duplicates.

### Request

**GET with query params:**
```http
GET /api/webhook/check?title=<TITLE>&author=<AUTHOR> HTTP/1.1
Host: pustaka.taratsa.id
Cookie: <SESSION_COOKIE>
```

**POST with JSON body:**
```http
POST /api/webhook/check HTTP/1.1
Host: pustaka.taratsa.id
Content-Type: application/json
Cookie: <SESSION_COOKIE>

{"title": "<TITLE>", "author": "<AUTHOR>"}
```

### Python Example

```python
# Check if book exists
params = {"title": "OK Bookchin", "author": "Tidak ketahui"}
response = session.get("https://pustaka.taratsa.id/api/webhook/check", params=params)
print(response.json())
```

### Response

```json
{
  "found": true,
  "count": 1,
  "results": [
    {
      "book_id": 1456,
      "title": "OK Bookchin",
      "authors": ["Tidak ketahui"],
      "url": "https://pustaka.taratsa.id/book/1456"
    }
  ]
}
```

If no book is found:
```json
{
  "found": false,
  "count": 0,
  "results": []
}
```

### Use Case

AI agent workflow:
1. Extract title/author from file
2. Call `/api/webhook/check` to see if book exists
3. If `found: true`, skip upload or update existing book
4. If `found: false`, proceed with upload