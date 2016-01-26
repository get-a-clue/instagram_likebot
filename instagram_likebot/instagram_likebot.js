// Instagram like bot will help you like any accounts automatically.
//
// Installation: npm install
//               edit user-specific variables in settings.json
//               node instagram_likebot.js
//
var webdriver = require('selenium-webdriver'),
by = webdriver.By,
Promise = require('promise'),
settings = require('./settings.json');

var log4js = require('log4js'); 
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('instabot.log'), 'instabot');
var logger = log4js.getLogger('instabot');
logger.setLevel('DEBUG');

var xpath_first_photo = '//header/../div/div/div[1]/a[1]';
var xpath_like_button = '//div[@id="fb-root"]/following-sibling::div[1]/div/div/following-sibling::div[1]/div/article/div[2]/section[2]/a';
var xpath_nextprev_buttons = '//div[@id="fb-root"]/following-sibling::div[1]/div/div/div/div/*';

var browser = new webdriver
    .Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

browser.manage().window().setSize(1024, 700);
browser.get('https://www.instagram.com/accounts/login/');
browser.findElement(by.name('username')).sendKeys(settings.instagram_account_username);
browser.findElement(by.name('password')).sendKeys(settings.instagram_account_password);
browser.findElement(by.xpath('//button')).click();
browser.sleep(settings.sleep_delay).then(function() {
    like_by_nickname(0);
});

function like_by_nickname(indexNickname) {
    if (indexNickname >= settings.instagram_accounts_to_be_liked.length) {
        logger.info('Everything is done. Finishing...');
        browser.quit();
        return;
    }
    var promise = new Promise(function (resolve, reject) {    
        browser.sleep(settings.sleep_delay);
        logger.info('Doing likes for: ' + settings.instagram_accounts_to_be_liked[indexNickname]);
        browser.get('https://instagram.com/' + settings.instagram_accounts_to_be_liked[indexNickname]);
        browser.sleep(settings.sleep_delay);
        browser.findElement(by.xpath(xpath_first_photo)).click().then(function () {
            like(resolve, 0, settings.like_depth_per_user);
        });
    });
    promise.then(function() {
        indexNickname++;
        like_by_nickname(indexNickname);
    });
};

function like(resolve, index, max_likes) {
    browser.getCurrentUrl().then(function(url) {
        logger.debug('Current url:   ' + url);
        browser.sleep(settings.sleep_delay);

        browser.findElement(by.xpath(xpath_like_button)).getAttribute('class').then(function(classname) {
            logger.debug('CSS Classname: ' + classname);
            if (settings.smart_like_mode && (classname.indexOf('coreSpriteHeartFull') > 0)) {
                logger.info('Already liked. Stopping...');
                resolve();
                return;
            } else {
                if (classname.indexOf('coreSpriteHeartOpen') > 0) {
                    browser.findElement(by.xpath(xpath_like_button)).click();
                    browser.sleep(settings.sleep_delay);
                };
                // Analyzing "Next" button availability
                browser.findElements(by.xpath(xpath_nextprev_buttons)).then(function(buttons) {
                    logger.debug('Buttons: ' + buttons.length + ', Photo Index: ' + index);
                    if (((index == 0) && (buttons.length == 1)) || (buttons.length == 2)) {
                        buttons[buttons.length - 1].click().then(function() {
                            // if we exceed maximum likes depth, stop like this current user.
                            index++;
                            if (index == max_likes) {
                                resolve();
                                return;
                            }
                            like(resolve, index, max_likes);
                        });
                    } else {
                        // "Next" button doesn't exist. Stop like this current user.
                        logger.info('Next button does not exist. Stopping...');
                        resolve();
                        return;
                    }
                });
            }
        });
    });
}
