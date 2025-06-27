import requests
import imageio
from lottie.parsers.tgs import parse_tgs

bot_token = '7878144684:AAEyxE_SKZiUN1Tl0x-xLD4D1p1cLt5Oy1A'

stickers = {
    "basic-heart": "CAACAgIAAxkBAAEQMiVoXsfQC3tLB1Q5Xfn4snqfCX-eEgACh40AAh0VOEu0ajsdvDsQdTYE",
    "basic-teddybear": "CAACAgIAAxkBAAEQMidoXsfQ6jqrmMGS5eQU-JrjVr8gQQACHWgAAtmbOEs5BJf9n_pcRDYE",
    "basic-rose": "CAACAgIAAxkBAAEQMiloXsfSsURl52q8w8vjj9XufBDObAACsGkAAjKHMEuTOa0eBDdbWTYE",
    "basic-rocket": "CAACAgIAAxkBAAEQMi1oXsfVqqhLsGrWHOuSO0aMkkIOCwACy20AAnNMMUsZQ8FenC1_QzYE",
    "basic-trophy": "CAACAgIAAxkBAAEQMitoXsfVx8skkCUiiwNdEk19l5JWogACfmgAAoNhMEtgGCgzeoBKJTYE",
    "basic-lunar-snake": "CAACAgIAAxkBAAEQMjloXsfnJcqQFk4uIhMJZUfeBkXsLQAC2XAAAhF7OEv_zoTAUTwDpjYE",
    "standard-desk-calendar": "CAACAgIAAxkBAAEQMkloXsgAAVb8XAyqqht5sPw4fzJUmXUAAi1vAAI3ajFLWBPq7JM6Nfc2BA",
    "standard-b-day-candle": "CAACAgIAAxkBAAEQMjFoXsfZyZaxmRMxNLuBEHxdAjR2ewAC02kAAlTrMUu4t9wy0hNr1jYE",
    "standard-jester-hat": "CAACAgIAAxkBAAEQMj9oXsfvl1bwIHsb3SQ6ogVr_jZDuQACvGgAAkZZMEuVAAGvDONrmpA2BA",
    "rare-evil-eye": "CAACAgIAAxkBAAEQMkVoXsf5HQ8WIMBUoiW6C6f9iM8fmAACUmYAAl6hMEumAXf3U5W9yzYE",
    "rare-homemade-cake": "CAACAgIAAxkBAAEQMi9oXsfYKdhuONqMkHha02xGpzfKEQACfG0AAmVDOEtbZ68v-_1WxjYE",
    "rare-easter-egg": "CAACAgIAAxkBAAEQMltoXsuM6PNg16w8Ciltjg8O_Q6_lwACCHMAAgwMKEiaolT5ums2AAE2BA",
    "epic-light-sword": "CAACAgIAAxkBAAEQMjVoXsfeJp0MrKtm4I2Mul0gXdiM4gACAWoAAvvWMUvQaKVZz5CdHjYE",
    "epic-eternal-candle": "CAACAgIAAxkBAAEQMkdoXsf_6LoU-lHR8XqcXy9248JkngAC_W0AAqQwOUt16tDr0huL_DYE",
    "epic-candy-cane": "CAACAgIAAxkBAAEQMmNoXswSIXAHrCepMkHdsKXfKfK0EAACY2sAAlwmOEu4GoWuLx5BfTYE",
    "legendary-jelly-bunny": "CAACAgIAAxkBAAEQMkFoXsfzMVA3FR0VFHrASvfDfXhs_AACcnQAAmvaOUt3qy28Ww-sIjYE",
    "legendary-ginger-cookie": "CAACAgIAAxkBAAEQMj1oXsfrnGy3JvJrXDDtm8KE7JCPcgAC92MAAiGeMUuBisCikpT5gDYE",
    "legendary-cookie-heart": "CAACAgIAAxkBAAEQMjtoXsfqL7r65frVhvhmqB6RXdvN-QACUG4AAk1ZMEsubLTtrDixzzYE",
    "mythic-diamond-ring": "CAACAgIAAxkBAAEQMjdoXsfgkhV0t0COvH0dOnzyrFhk8wAC9WsAAtjZMUtSevP80dNuKjYE",
    "mythic-neko-helmet": "CAACAgIAAxkBAAEQMjNoXsfaEeRq0pEQ_jUxrlsn1ZsCIwACU28AAhu-OUsY-fBIxNDPNDYE",
    "mythic-durov-cap": "CAACAgIAAxkBAAEQMkNoXsf056dolZjiowsTIOLTYg6RygACrmcAAjoPOUsRwF6fUR3DGDYE"
}

def download_tgs(name, file_id):
    url = f'https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}'
    resp = requests.get(url)
    file_path = resp.json()['result']['file_path']
    tgs_url = f'https://api.telegram.org/file/bot{bot_token}/{file_path}'
    tgs_data = requests.get(tgs_url).content
    tgs_filename = f"{name}.tgs"
    with open(tgs_filename, "wb") as f:
        f.write(tgs_data)
    print(f"Скачан: {tgs_filename}")
    return tgs_filename

def tgs_to_gif(tgs_path, gif_path, fps=30):
    animation = parse_tgs(tgs_path)
    frames = []
    for i in range(int(animation.frame_rate * animation.duration)):
        frame = animation.render_frame(i / animation.frame_rate)
        frames.append(frame)
    imageio.mimsave(gif_path, frames, duration=1/animation.frame_rate)
    print(f"Сохранено gif: {gif_path}")

if __name__ == "__main__":
    for name, file_id in stickers.items():
        tgs_file = download_tgs(name, file_id)
        gif_file = f"{name}.gif"
        tgs_to_gif(tgs_file, gif_file)
        # Можно удалить tgs после конвертации
        # os.remove(tgs_file)