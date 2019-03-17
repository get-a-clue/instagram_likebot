import time
import re
import logging
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException

NEWSFEED_STOP_CONTINUOUS_ALREADY_LIKED = 10
XPATH_LOGIN_INPUT = "//input[@name='username']"
XPATH_PASSWORD_INPUT = "//input[@name='password']"
XPATH_LOGIN_BUTTON = "//button[@type='submit']"
#XPATH_LOGIN_INCORRECT_TEXT = "//*[contains(text(),\"Sorry, your password was incorrect. Please double-check your password.\")]"
XPATH_TURN_ON_NOTIFICATIONS_TEXT = "//*[contains(text(),\"Turn on Notifications\")]"
XPATH_NOT_NOW_TEXT = "//*[contains(text(),\"Not Now\")]"


class InstaDriver:

    def __init__(self, is_headless, login, password):
        logging.info("Initializing InstaDriver for login={0}".format(login))
        self.login = login
        self.password = password

        userdatadir = "c:\\tmp\\likebot_" + login
        chrome_options = webdriver.ChromeOptions()
        chrome_arguments = ["--disable-extensions", "--no-default-browser-check",
                            "--disable-sync", "--user-data-dir=" + userdatadir, "--disk-cache-size=102400"]
        if is_headless:
            chrome_arguments.append("--headless")
            chrome_arguments.append("--disable-gpu")
            chrome_arguments.append("--window-size=1280,1280")
        for a in chrome_arguments:
            chrome_options.add_argument(a)
        self.driver = webdriver.Chrome(options=chrome_options)

    def do_sleep(self, tick):
        time.sleep(tick)

    def go_url(self, url):
        logging.info("Goto url: {0}".format(url))
        self.driver.get(url)
        self.do_sleep(1)

    def do_click_delay(self, element, tick):
        element.click()
        self.do_sleep(tick)

    def do_click(self, element):
        self.do_click_delay(element, 1)

    def check_already_logged_user(self):
        try:
            self.driver.find_element_by_xpath('//a[@href="/{0}/"]'.format(self.login))
            logging.info("User is already logged")
            return True
        except NoSuchElementException:
            logging.info("User is not logged")
        return False

    def do_login(self):
        logging.info("Doing login for user: {0}".format(self.login))
        self.go_url("https://instagram.com/accounts/login")
        login_input = self.driver.find_element_by_xpath(XPATH_LOGIN_INPUT)
        login_input.send_keys(self.login)
        password_input = self.driver.find_element_by_xpath(XPATH_PASSWORD_INPUT)
        password_input.send_keys(self.password)
        login_button = self.driver.find_element_by_xpath(XPATH_LOGIN_BUTTON)
        self.do_click_delay(login_button, 3)
        url = self.driver.current_url
        logging.info("Url after login: {0}".format(url))
        if url.find("#reactivated") > 0:
            self.do_click(self.driver.find_element_by_xpath(XPATH_NOT_NOW_TEXT))
            return True
        if url.endswith("instagram.com") or url.endswith("instagram.com/"):
            return True
        logging.error("Login has been failed".format(url))
        return False

    def suppress_notifications(self):
        try:
            self.driver.find_element_by_xpath(XPATH_TURN_ON_NOTIFICATIONS_TEXT)
            self.do_click(self.driver.find_element_by_xpath(XPATH_NOT_NOW_TEXT))
            logging.info("Notifications have been suppressed")
        except NoSuchElementException:
            pass

    def find_article_url(self, article):
        article_url = ""
        ahrefs = article.find_elements_by_xpath("div[2]/..//a")
        for ahref in ahrefs:
            attr = ahref.get_attribute("href")
            if re.search("liked_by", attr) is not None:
                continue
            x = re.search("https://www.instagram.com/p/.{9,50}/$", attr)
            if x is not None:
                article_url = attr
                break
        return article_url

    def like_newsfeed_article(self, article, article_url, author):
        try:
            article.find_element_by_xpath('div[2]/section/span/..//span[@aria-label="Unlike"]')
            return False
        except NoSuchElementException:
            pass

        element = article.find_element_by_xpath('div[2]/section/span/..//span[@aria-label="Like"]')
        self.do_click_delay(element, 3)
        logging.info("+++ Liked newsfeed article: {0} by {1}".format(article_url, author))
        return True

    def do_like_newsfeed(self, likes_max):
        logging.info("Doing article newsfeed for login: {0}".format(self.login))
        likes_count = 0
        already_liked_continuous = 0
        articles_discovered = 0
        visited = {}

        while True:
            articles = self.driver.find_elements_by_xpath("//article")
            likes_current_articles = 0
            for article in articles:
                article_url = self.find_article_url(article)
                if article_url == "":
                    logging.error("Unable for find article_url")
                    break

                # if article is already visited, skip it
                if visited.get(article_url) is None:
                    author = article.find_element_by_xpath('header/.//a').get_attribute("href").replace("https://www.instagram.com/","").replace("/","")
                    logging.info("Found newsfeed article: {0} by {1}".format(article_url, author))
                    visited[article_url] = 1
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", article)
                    self.do_sleep(1)
                    articles_discovered += 1

                    if self.like_newsfeed_article(article, article_url, author) is True:
                        already_liked_continuous = 0
                        likes_count += 1
                        likes_current_articles += 1
                    else:
                        already_liked_continuous += 1

                if likes_count >= likes_max:
                    break

                if already_liked_continuous >= NEWSFEED_STOP_CONTINUOUS_ALREADY_LIKED:
                    logging.info("Stopping because continuous already liked is exceeded")
                    break

            if likes_current_articles == 0 and articles_discovered >= NEWSFEED_STOP_CONTINUOUS_ALREADY_LIKED:
                logging.info("Break because likes_current_articles is zero")
                break

            if already_liked_continuous >= NEWSFEED_STOP_CONTINUOUS_ALREADY_LIKED:
                logging.info("Stopping because continuous already liked is exceeded")
                break

        return likes_count
