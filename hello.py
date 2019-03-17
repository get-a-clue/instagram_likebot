import sys
from instahelpers import *

instagram_login = "-- set your instagram login here ---"
instagram_password = "--- set your instagram password here ---"

logging.basicConfig(
    level = logging.INFO,
    format = "%(levelname)-8s [%(asctime)s]  %(message)s",
    handlers = [
        logging.FileHandler("likebot_" + instagram_login + ".log"),
        logging.StreamHandler()
    ])

logging.info("Application started")
idriver = InstaDriver(True, instagram_login, instagram_password)
idriver.go_url("https://instagram.com")

driver = idriver.driver
assert "Instagram" in driver.title
idriver.suppress_notifications()

if idriver.check_already_logged_user() is False:
    if idriver.do_login() is False:
        sys.exit(1)
    idriver.suppress_notifications()

idriver.do_like_newsfeed(50)
driver.close()
driver.quit()
