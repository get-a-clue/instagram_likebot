// Instagram like bot will help you like any accounts automatically.
//
// Installation: npm install
//               edit user-specific variables
//               node instagram_likebot.js
//
var webdriver = require('selenium-webdriver'),
by = webdriver.By,
Promise = require('promise');

// ------ Start defining user-specific variables ------
var sleep_delay = 2200;
var smart_likes_mode = false;
var instagram_account_username = '<your_instagram_account_here>';
var instagram_account_password = '<your_instagram_password_here>';
var instagram_accounts_to_be_liked = ['navalny4', 'xenia_sobchak'];
// ------ Stop defining user-specific variables ------

var xpath_first_photo = '//header/../div/div/div[1]/a[1]';
var xpath_like_button = '//div[@id="fb-root"]/following-sibling::div[1]/div/div/following-sibling::div[1]/div/article/div[2]/section[2]/a';
var xpath_nextprev_buttons = '//div[@id="fb-root"]/following-sibling::div[1]/div/div/div/div/*';

var browser = new webdriver
    .Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

browser.manage().window().setSize(1024, 700);
browser.get('https://www.instagram.com/accounts/login/');
browser.findElement(by.name('username')).sendKeys(instagram_account_username);
browser.findElement(by.name('password')).sendKeys(instagram_account_password);
browser.findElement(by.xpath('//button')).click();
browser.sleep(sleep_delay).then(function() {
    like_by_nickname(0);
});

function like_by_nickname(indexNickname) {
    if (indexNickname >= instagram_accounts_to_be_liked.length) {
        console.log('Everything is done. Finishing...');
        browser.quit();
        return;
    }
    var nickname = instagram_accounts_to_be_liked[indexNickname];
    var promise = new Promise(function (resolve, reject) {    
        browser.sleep(sleep_delay);
        console.log('Doing likes for: ' + nickname);
        browser.get('https://instagram.com/' + nickname);
        browser.sleep(sleep_delay);
        browser.findElement(by.xpath(xpath_first_photo)).click().then(function () {
            like(resolve, 0, 3);
        });
    });
    
    Promise.all([promise]).then(function(res) {
        indexNickname++;
        like_by_nickname(indexNickname);
    });
};

function like(resolve, index, max_likes) {
    browser.getCurrentUrl().then(function(url) {
        console.log('Current url:   ' + url);
        browser.sleep(sleep_delay);

        browser.findElement(by.xpath(xpath_like_button)).getAttribute('class').then(function(classname) {
            console.log('CSS Classname: ' + classname);
            if (smart_likes_mode && (classname.indexOf('coreSpriteHeartFull') > 0)) {
                console.log('Already liked. Stopping...');
                resolve();
                return;
            } else {
                if (classname.indexOf('coreSpriteHeartOpen') > 0) {
                    browser.findElement(by.xpath(xpath_like_button)).click();
                    browser.sleep(sleep_delay);
                };
                // Analyzing "Next" button availability
                browser.findElements(by.xpath(xpath_nextprev_buttons)).then(function(buttons) {
                    console.log('Buttons: ' + buttons.length + ', Photo Index: ' + index);
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
                        console.log('Next button does not exist. Stopping...');
                        resolve();
                        return;
                    }
                });
            }
        });
    });
}
