# Fotos reais dos produtos (seed)

Larga aqui as fotos dos produtos com o **EAN** como nome do ficheiro. O import
liga cada foto ao produto certo e a foto real ganha sempre ao placeholder.

- Formatos aceites: `.jpg` `.jpeg` `.png` `.webp` `.avif`
- Nome = EAN do produto. Exemplos:

| Ficheiro            | Produto                        |
| ------------------- | ------------------------------ |
| `4711636338417.jpg` | ASUS Vivobook 15 F1504VA       |
| `0199896577045.jpg` | HP 14-ha0003np                 |
| `4711474460080.jpg` | ACER Chromebook 315            |
| `8806094938247.jpg` | Monitor Samsung Odyssey G5 27" |
| `5099206082434.jpg` | Teclado Logitech MX Keys S     |
| `5099206099142.jpg` | Rato Logitech MX Master 3S     |
| `6901443394746.jpg` | Xiaomi Redmi Note 13           |
| `4711387431290.jpg` | Desktop Lenovo IdeaCentre 3    |

Depois de largar os ficheiros, corre na pasta `api/`:

```
npm run seed:images
```

Os produtos sem foto recebem um placeholder on-brand gerado automaticamente.
As imagens finais ficam em `api/uploads/` (runtime, fora do git) — por isso é
esta pasta `seed-assets/` que fica versionada e reproduz tudo na máquina do
professor.
