import requests
import os

bot_token = '7878144684:AAEyxE_SKZiUN1Tl0x-xLD4D1p1cLt5Oy1A'

stickers = {
    "pet-snake": "CAACAgIAAxkBAAEQOyRoYQxvDB85njuSrxtIbkgTLVFHUAACf28AAuNkIEmUbP_1sbK3fzYE",
    "snake-box": "CAACAgIAAxkBAAEQOyZoYQx0ngv6tIMe20xvPSVC9TDS5QAC8HsAApnzIUkRukXLtYyeJzYE",
    "sakura-flower": "CAACAgIAAxkBAAEQOyhoYQx_HSvJ2ht0abwNtQ1ERCmt4QACe28AAvWBQEuQJyWPSSNJLzYE",
    "astral-shard": "CAACAgIAAxkBAAEQOypoYQ0Us9WWWzOZWZsxbDil0Rmt0wAC1HMAAjwfOUuMFqS28yuWDDYE",
    "snow-mittens": "CAACAgIAAxkBAAEQOyxoYQ0bEwqIH5c63cy_8sQLTAEkUgACbmoAAgK6SUsnWcbf79nC3TYE",
    "heart-locket": "CAACAgIAAxkBAAEQOy5oYQ0gUEOiU9JpDUe0X75LA436-QACynQAAmn9yUkC656fs-qNhzYE",
    "trapped-heart": "CAACAgIAAxkBAAEQOzBoYQ0naT8qlc4JXwGzY8_McG9dEwAC1GwAAsFoSUsaa3vYkOsJeDYE",
    "eternal-rose": "CAACAgIAAxkBAAEQOzJoYQ5qZiqiSL_tD-sYNc_w0SGxfwACBGoAAqavOEv7XWCiKD7sojYE",
    "bow-tie": "CAACAgIAAxkBAAEQOzRoYQ5vq1AvqeuGLcJhoKlpKFPhFgACC3kAAu1QmUmM3MwJHpT7mTYE",
    "precious-peach": "CAACAgIAAxkBAAEQOzZoYQ52I-LPCcfuO0m49ANTz8DjawACDXUAAg5UQEuEwhWkjbMJ5TYE",
    "restless-jar": "CAACAgIAAxkBAAEQOzhoYQ557lzh7QRqw_eHm-FRICMt8AACFYMAAhv0eUkDvnC5wBmSdzYE",
    "candy-cane": "CAACAgIAAxkBAAEQOzpoYQ5_8mHAmSIii1ZBjmd4oNp-XQACEG0AAlzsOUsbP8ub7GRuxTYE",
    "lol-pop": "CAACAgIAAxkBAAEQOzxoYQ6GjnFN3GmJivsGoNM3DPL6xQACJnIAAsxDOUt5tV_57jAZQTYE",
    "mad-pumpkin": "CAACAgIAAxkBAAEQOz5oYQ6MEM3xoAxN2hCeQdLia-0GZgAC3WMAAmUiOEvQHGi3rKIrvzYE",
    "holiday-drink": "CAACAgIAAxkBAAEQO0BoYQ6SZI4e6PPxWV8JYGoqWmEWFAACjXQAAoJxIEkB_FOmxzLjmDYE",
    "big-year": "CAACAgIAAxkBAAEQO0JoYQ6YzFl3It9kwRytVWRSg0EfOwAClWwAAjQxIUnUwwbsdd1aRzYE",
    "magic-potion": "CAACAgIAAxkBAAEQO0RoYQ6eK2TSl7UVKb5bLZm0IVWh4wACSm4AAmHVOEsTgtkuEi59cjYE",
    "crystal-ball": "CAACAgIAAxkBAAEQO0ZoYQ6h_V54XxcvUVvtZuMPhZe86AACLnQAAgQQOEtS59VFYJR-MzYE",
    "hypno-lollipop": "CAACAgIAAxkBAAEQO0hoYQ6pWxV9vO6_koGvgStIW_bp3gACL3AAAjJBOUtqXeHNrdUSLDYE",
    "witch-hat": "CAACAgIAAxkBAAEQO2NoYRF7QBDhK7PsJ74SKFU7rVImWQACS3QAArWZQUvTrhJ2fJPtCTYE",
    "voodoo-doll": "CAACAgIAAxkBAAEQO2VoYRGBpaC2n-zywbwN2cmg7H3umwACKmoAAj23SUtxk3FvxQ4qcjYE",
    "hex-pot": "CAACAgIAAxkBAAEQO2doYRGGfxPrwvAf6qxotN__MEdb-wACrWYAAnfROUtwI0ufPBxSzjYE",
    "snow-globe": "CAACAgIAAxkBAAEQO2loYRGK3Ina6SoQ43C6xcr4tMsRLAACz3YAAvYjQEvmyp2Io4ntSDYE",
    "sleigh-bell": "CAACAgIAAxkBAAEQO2toYRGP6beNKQ5jpT-hfPBOQui81gAC_3YAAoK9SEtTw7fluP2znjYE",
    "winter-wreath": "CAACAgIAAxkBAAEQO21oYRGUT2LtKGsTDXU-UkoumwPyNQACc3IAAocVQEvSr4z3zoog_zYE",
    "santa-hat": "CAACAgIAAxkBAAEQO29oYRGXxZRzW51J8-16no3ch5oYugACa3oAAjsfQUtRx9SuF4KGzzYE",
    "jingle-bells": "CAACAgIAAxkBAAEQO3FoYRHeRAWFElyswVuQgerpK5YcWwAC3WgAAjIGOEsN0SNSwHkaUjYE",
    "party-sparkler": "CAACAgIAAxkBAAEQO3NoYRKqAAFf_Ie9u_YFr0MQKunpEO0AAnltAAKVM0FLVOXjF1p5BD42BA",
    "plush-pepe": "CAACAgIAAxkBAAEQO3VoYRKvKC-kyoB3Rksh75l6Yaut3AAC9mcAAlSQOEvX_ZbYfGWL_TYE",
    "top-hat": "CAACAgIAAxkBAAEQO3doYRK2p2Y5bDKWntC5gzApaE4mIgACSncAAq7cUEtfPaPzpfWIUTYE",
    "flying-broom": "CAACAgIAAxkBAAEQO3loYRK7a4__nUK_zIzzIJJwYt3LpgACeHEAAqgoOEtqY7D5EEWEuDYE",
    "record-player": "CAACAgIAAxkBAAEQO3toYRLBuvRQiZnnms-IW7G6p8py3AACLnkAAptfQUuLAYU_-xJJQjYE",
    "sharp-tongue": "CAACAgIAAxkBAAEQO31oYRLIXZaOpBaYg26hbSHS6TJU2wACGGoAAvaxSEu-8ogd_bvU9DYE",
    "star-notepad": "CAACAgIAAxkBAAEQO39oYRLPQ8_bVoecQCr8YS59d562uAACGncAAkfrQEsRkVn0ObtkHDYE",
    "ion-gem": "CAACAgIAAxkBAAEQO4FoYRLUFbqMVPEAAZVcCHQG5SMi-8kAArh0AAKmIDhLCeFzvzq8vsA2BA",
    "scared-cat": "CAACAgIAAxkBAAEQO4NoYRLZyxh9MPAEtge7LMQPxZ11ngAC0nQAAi2MSUs8sETr-W8eYDYE",
    "kissed-frog": "CAACAgIAAxkBAAEQO4VoYRLdiYfI4KNKlTifLww8cWIAAboAAp90AAKyezhLtUZpVQSAuIc2BA",
    "electric-skull": "CAACAgIAAxkBAAEQO4doYRLhxiFhFr16pjA4FeOFYNb9HwAC-3AAAuuUEUhjvg_2xA-IPTYE",
    "heroic-helmet": "CAACAgIAAxkBAAEQO4loYRLmSan98T4UIjXvh6mvfw_PKQACDnsAArFHmElZ9o_LU7N8ujYE",
    "mini-oscar": "CAACAgIAAxkBAAEQO4toYRLqDjjPYo5DrudKa7Vhr5LpIQACMXUAAtbgOUt-vR5FZl6WVjYE",
    "swiss-watch": "CAACAgIAAxkBAAEQO41oYRLukmkwp8iVHaDxn529ydgZlAACmnAAAlalQUseYs_oE6yZCTYE",
    "vintage-cigar": "CAACAgIAAxkBAAEQO49oYRLxY5osPzFzAAGMAwWN3Ei44jIAAk9yAAJh1khLw1-UdEbGAf02BA",
    "gem-signet": "CAACAgIAAxkBAAEQO5FoYRL1DFxj0soTbx0scCzuo3VWXwACtW8AAohXWElgJ7vJd5BW6DYE",
    "skull-flower": "CAACAgIAAxkBAAEQO5NoYRL5OO8F575MxvCENGOgCnJMdAACsmwAAh9FSEv-9lMcx9cczjYE",
    "lush-bouquet": "CAACAgIAAxkBAAEQO5VoYRL9HqVlENWKmxAMFBOc9UYbTQACC3UAAnQ8MUrFsFOTC2b1bjYE",
    "berry-box": "CAACAgIAAxkBAAEQO5doYRMAAThvr0xPwuwrKn6LHYdyeXIAAntmAAJdjjlLSBDMtcHZyJ02BA",
    "perfume-bottle": "CAACAgIAAxkBAAEQO5loYRME8DSlLRQ3CWviS2cmCSvspAACLGQAAk74SEtTU5SscRFNBTYE",
    "signet-ring": "CAACAgIAAxkBAAEQO5toYRMIiK0yLoo_WYArwwy97WbyIAACaHIAAuVCQEtnJPpKR_RxFzYE",
    "bonded-ring": "CAACAgIAAxkBAAEQO51oYRMMhK1Jq7gnx3ETS5G8W31S7AAC1HsAArg1IEmteDUrHem3uTYE",
    "nail-bracelet": "CAACAgIAAxkBAAEQO59oYRMPa-gtW5PEllzg4DU-HtU9LQACunMAAq7UeElBvk4hwf8OYDYE",
    "tama-gadget": "CAACAgIAAxkBAAEQO6FoYRMT4dSfwZRd0R2JbosgV8Lb1gACRHQAAq3YQEtyLsl11kii9TYE",
    "toy-bear": "CAACAgIAAxkBAAEQO6NoYRMWC1kaFKZwvTM9N8O1qyJdDAACfHAAAgXESUuHDpbr0CXmKDYE"
}

os.makedirs('tgs', exist_ok=True)

for name, file_id in stickers.items():
    url = f'https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}'
    resp = requests.get(url)
    file_path = resp.json()['result']['file_path']
    tgs_url = f'https://api.telegram.org/file/bot{bot_token}/{file_path}'
    tgs_data = requests.get(tgs_url).content
    tgs_name = f'tgs/{name}.tgs'
    with open(tgs_name, "wb") as f:
        f.write(tgs_data)
    print(f"Скачан: {tgs_name}")