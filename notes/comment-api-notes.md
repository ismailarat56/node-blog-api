Comment JSON Yapısı
{
"id": 7,
"post_id": 1,
"parent_id": null,
"body": "Çok faydalı bir yazı olmuş.",
"status": "visible",
"author": {
"id": 4,
"name": "Mehmet Okur"
},
"edited_at": null,
"created_at": "2026-09-08T18:10:00.000Z",
"updated_at": "2026-09-08T18:10:00.000Z",
"deleted_at": null,
"replies": []
}

Endpointler
GET /api/v1/posts/:postId/comments giriş yapan herkes
POST /api/v1/posts/:postId/comments giriş yapan herkes
PATCH /api/v1/comments/:id yorum yazarı veya admin
DELETE /api/v1/comments/:id yorum yazarı, post yazarı veya admin
PATCH /api/v1/comments/:id/hide post yazarı veya admin
PATCH /api/v1/comments/:id/unhide post yazarı veya admin
GET /api/v1/public/posts/:slug/comments herkes, token yok
