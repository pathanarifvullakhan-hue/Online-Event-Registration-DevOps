
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Read and normalize environment URLs
function cleanUrl(value, fallback) {
  return (value || fallback)
    .split(String.fromCharCode(92))
    .join('')
    .trim();
}

const baseUrl = cleanUrl(
  process.env.BASE_URL,
  'http://localhost:3000'
);

const seleniumUrl = cleanUrl(
  process.env.SELENIUM_URL,
  'http://localhost:4444'
);

(async () => {
  let driver;

  try {
    console.log('Original BASE_URL:', JSON.stringify(process.env.BASE_URL));
    console.log('Original SELENIUM_URL:', JSON.stringify(process.env.SELENIUM_URL));

    console.log('Corrected BASE_URL:', JSON.stringify(baseUrl));
    console.log('Corrected SELENIUM_URL:', JSON.stringify(seleniumUrl));

    if (!baseUrl.startsWith('http://') &&
        !baseUrl.startsWith('https://')) {
      throw new Error('Invalid application URL: ' + baseUrl);
    }

    if (!seleniumUrl.startsWith('http://') &&
        !seleniumUrl.startsWith('https://')) {
      throw new Error('Invalid Selenium URL: ' + seleniumUrl);
    }

    const options = new chrome.Options().addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    );

    const builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .usingServer(seleniumUrl);

    driver = await builder.build();

    // TC01: Load home page and event listing
    console.log('Opening application...');
    await driver.get(baseUrl);

    await driver.wait(
      until.elementLocated(By.css('#eventList .event-card')),
      15000
    );

    console.log('TC01 PASS: Home and event listing page loaded');

    // TC02: Student registration
    await driver.findElement(
      By.css('#registerForm input[name="name"]')
    ).sendKeys('Selenium Student');

    await driver.findElement(
      By.css('#registerForm input[name="email"]')
    ).sendKeys(`selenium${Date.now()}@example.com`);

    await driver.findElement(
      By.css('#registerForm input[name="password"]')
    ).sendKeys('Student@123');

    await driver.findElement(
      By.css('#registerForm button[type="submit"]')
    ).click();

    await driver.wait(
      until.elementIsVisible(
        driver.findElement(By.css('#my-events'))
      ),
      10000
    );

    console.log('TC02 PASS: Student registration successful');

    // TC08: Event registration confirmation
    const registerButton = await driver.wait(
      until.elementLocated(
        By.css('#eventList button[data-register]')
      ),
      10000
    );

    await registerButton.click();

    await driver.wait(async () => {
      const notice = await driver.findElement(
        By.css('#notice')
      ).getText();

      return notice.includes('Registration confirmed');
    }, 10000);

    console.log('TC08 PASS: Event registration confirmation displayed');

    // TC09: Verify registered event
    await driver.findElement(By.id('myLink')).click();

    await driver.wait(
      until.elementLocated(By.css('#myList .event-card')),
      10000
    );

    console.log('TC09 PASS: Registered event displayed in My Registrations');

    console.log('ALL SELENIUM TESTS COMPLETED');

  } catch (error) {
    console.error('SELENIUM TEST FAILED:', error);
    process.exitCode = 1;

  } finally {
    if (driver) {
      await driver.quit();
    }
  }
})();
