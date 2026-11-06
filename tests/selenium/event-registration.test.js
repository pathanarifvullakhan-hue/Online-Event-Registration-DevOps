const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const seleniumUrl = process.env.SELENIUM_URL;
(async () => {
  let driver;
  try {
    const options = new chrome.Options().addArguments('--headless=new','--no-sandbox','--disable-dev-shm-usage');
    const builder = new Builder().forBrowser('chrome').setChromeOptions(options);
    if (seleniumUrl) builder.usingServer(seleniumUrl);
    driver = await builder.build();
    await driver.get(baseUrl);
    await driver.wait(until.elementLocated(By.css('#eventList .event-card')), 15000);
    console.log('TC01 PASS: Home and event listing page loaded');

    await driver.findElement(By.css('#registerForm input[name="name"]')).sendKeys('Selenium Student');
    await driver.findElement(By.css('#registerForm input[name="email"]')).sendKeys(`selenium${Date.now()}@example.com`);
    await driver.findElement(By.css('#registerForm input[name="password"]')).sendKeys('Student@123');
    await driver.findElement(By.css('#registerForm button[type="submit"]')).click();
    await driver.wait(until.elementIsVisible(driver.findElement(By.css('#my-events'))), 10000);
    console.log('TC02 PASS: Student registration successful');

    const registerButton = await driver.findElement(By.css('#eventList button[data-register]'));
    await registerButton.click();
    await driver.wait(async () => (await driver.findElement(By.css('#notice')).getText()).includes('Registration confirmed'), 10000);
    console.log('TC08 PASS: Event registration confirmation displayed');

    await driver.findElement(By.id('myLink')).click();
    await driver.wait(until.elementLocated(By.css('#myList .event-card')), 10000);
    console.log('TC09 PASS: Registered event displayed in My Registrations');
  } catch (err) {
    console.error('Selenium test failed:', err);
    process.exitCode = 1;
  } finally {
    if (driver) await driver.quit();
  }
})();
