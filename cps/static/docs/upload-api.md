# Pustaka Taratsa Upload API

API untuk AI agent mengunggah file ke perpustakaan digital Pustaka Taratsa.

## Prerequisites

- AI agent harus memiliki akun di Pustaka Taratsa dengan role `upload`
- Hanya file **PDF** dan **EPUB** yang diizinkan

---

## Step 1: Login

AI agent harus login terlebih dahulu sebelum dapat mengunggah file.

### Request

```http
POST /login HTTP/1.1
Host: pustaka.taratsa.id
Content-Type: application/x-www-form-urlencoded

username=<USERNAME>&password=<PASSWORD>&remember_me=on
```

### Response

Berhasil login mengembalikan redirect dan session cookie.

**Catatan:** Simpan cookie yang diterima untuk request selanjutnya.

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
Content-Type: application/pdf (atau application/epub+zip)

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

### Response Berhasil

```json
{
  "book_id": 152,
  "title": "Kliping Hilang",
  "author": "Unknown",
  "description": "Deskripsi buku...",
  "publisher": "KontraS",
  "series": null,
  "series_id": null,
  "languages": ["Indonesian"],
  "tags": ["Arsip", "HAM"],
  "pubdate": "1998-04-11",
  "url": "https://pustaka.taratsa.id/book/152"
}
```

### Response Error

| Status | Error | Penyebab |
|--------|-------|----------|
| 401 | Authentication required | Belum login / session expired |
| 403 | Upload permission required | Akun tidak punya akses upload |
| 400 | No file provided | Tidak ada field `file` dalam request |
| 400 | Only PDF and EPUB files are allowed | Format file tidak didukung |

---

## Step 3: Gunakan Metadata

Response API berisi metadata yang sudah diekstrak dari file:

| Field | Deskripsi |
|-------|-----------|
| `book_id` | ID unik buku di sistem |
| `title` | Judul buku |
| `author` | Nama penulis |
| `description` | Deskripsi/Sinopsis dari file |
| `publisher` | Penerbit (jika ada di metadata file) |
| `series` | Nama seri (jika ada) |
| `series_id` | ID seri |
| `languages` | Daftar bahasa |
| `tags` | Daftar tag/kategori |
| `pubdate` | Tanggal publikasi |
| `url` | URL lengkap ke halaman buku |

---

## Contoh Lengkap dengan curl

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

### 3. Lihat Hasil

Buka URL yang dikembalikan di response untuk memverifikasi buku sudah terunggah dengan benar.

---

## Catatan Penting

1. **Metadata diekstrak otomatis** dari file PDF/EPUB - tidak perlu menambahkan manual
2. **Cover diekstrak otomatis** jika ada dalam file
3. **Session expire** - jika upload gagal dengan 401, login ulang
4. **File harus memiliki extension** - sistem menolak file tanpa extension

---

## Troubleshooting

### "Authentication required" (401)
- Pastikan login berhasil dan cookie tersimpan
- Coba login ulang dengan fresh session

### "Upload permission required" (403)
- Akun perlu diberikan role `upload` oleh admin

### Upload timeout
- File besar mungkin butuh waktu lebih lama
- Pastikan koneksi stabil

### "Only PDF and EPUB files are allowed"
- Konversi file ke PDF atau EPUB sebelum upload
- Cek extension file benar (.pdf atau .epub)