import requests

bot_token = '7878144684:AAEyxE_SKZiUN1Tl0x-xLD4D1p1cLt5Oy1A'

stickers = {
    "gcoins": "CAACAgIAAxkBAAEQMy5oXvZYFf4LTr0DM2x7zAwaC4CUzQACLFEAAucRQUmOOfnyXaFCbTYE"
}

for name, file_id in stickers.items():
    url = f'https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}'
    resp = requests.get(url)
    file_path = resp.json()['result']['file_path']
    tgs_url = f'https://api.telegram.org/file/bot{bot_token}/{file_path}'
    tgs_data = requests.get(tgs_url).content
    with open(f"{name}.tgs", "wb") as f:
        f.write(tgs_data)
    print(f"Скачан: {name}.tgs")