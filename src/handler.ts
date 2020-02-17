import { puppeteer, executablePath, args } from 'chrome-aws-lambda';
import moment from 'moment';
import AWS from 'aws-sdk';
import { Page } from 'puppeteer';
import { Iresults } from '.';
import config from './config';

const screenAndUploadToS3 = async (
    user: string,
    type: string,
    page: Page
) => {
    const s3 = new AWS.S3();
    const time = moment().format('YYYYMMDDHHmm');
    const screenshot = await page.screenshot();
    const objectDetail = await s3.upload({
        Bucket: `automation-report-${user}`,
        Key: `${time}/${type}-${time}`,
        Body: screenshot,
        ContentType: 'image/png',
        ACL: 'public-read'
    }).promise();
    return objectDetail;
}

const sendMail = async (
    results: Iresults,
    error: Error | null,
) => {
    const sns = new AWS.SNS();
    const { TopicArn } = (await sns.createTopic({ Name: 'automation-report' }).promise());
    let message = '';
    const {
        placeResult,
        statusResult,
        succeedResult,
        errorResult
    } = results;
    if (placeResult && statusResult && succeedResult) {
        message = `
        Place result:
        ${placeResult.Location}

        Status result:
        ${statusResult.Location}

        Succeed result
        ${succeedResult.Location}
        `;
        const sendMailResult = await sns.publish({ TopicArn, Message: message}).promise();
        return sendMailResult;
    }
    message = `
    Error during automation report.

    ${errorResult?.Location}
    `;
    await sns.publish({ TopicArn, Message: message}).promise();
    return true;
}

export const autoReport = async () => {
    let page: Page;
    const results: Iresults = {};
    try {
        const {
            user,
            email,
            password,
        } = process.env;
        const url = config.url;
        if (!email || !password || !user) {
            throw new Error('Missing params');
        }
        console.log(`
    ********    *******   *       *
    *          *           *     *
    ********  *             *   *
    *          *             * *
    ********    *******       *
        `);
        console.log(`[Message]: Start.`);
        const browser = await puppeteer.launch({
            args,
            executablePath: await executablePath,
        });
        console.log(`[Message]: Browser ready.`);
        page = (await browser.pages())[0] || await browser.newPage()
        
        console.log(`[Message]: Navigate to ${url}`);
        const response = await page.goto(url, { waitUntil: 'networkidle0' });
        await page.setContent((await response!.buffer()).toString('utf8'));
        console.log(`[Message]: Navigate to ${url} succeed.`);
        await page.waitForSelector('#i0116', { timeout: 60000 });
        await page.focus('#i0116');
        await page.keyboard.type(email);
        await page.click('#idSIButton9');
        await page.waitFor(500);
        await page.waitForSelector('#i0118', { timeout: 60000 });
        await page.focus('#i0118');
        await page.keyboard.type(password);
        await page.waitForSelector('input[value="Sign in"]', { timeout: 60000 });
        await page.click('input[value="Sign in"]');
        console.log(`[Message]: Login successfully.`);
        await page.waitForSelector('input[value="Yes"]', { timeout: 60000 });
        await page.click('input[value="Yes"]');
        await page.waitForSelector('input[value="辦公室 (ECV office)"]', { timeout: 60000 });
        await page.click('input[value="辦公室 (ECV office)"]');
        console.log(`[Message]: 選擇在 辦公室 (ECV office)`);
        results.placeResult = await screenAndUploadToS3(user, 'place', page);
        console.log(`[Message]: 截圖已儲存 ${results.placeResult.Location}`);
        await page.waitForSelector('.button-content', { timeout: 60000 });
        await page.click('.button-content');
        await page.waitForSelector('input[value="正常(well)"]', { timeout: 60000 });
        await page.click('input[value="正常(well)"]');
        console.log(`[Message]: 選擇 正常`);
        await page.waitForSelector('input[value="否No"]', { timeout: 60000 });
        await page.click('input[value="否No"]');
        console.log(`[Message]: 選擇 否No`);
        results.statusResult = await screenAndUploadToS3(user, 'status', page);
        console.log(`[Message]: 截圖已儲存 ${results.statusResult.Location}`);
        await page.waitForSelector('button[title="Submit"]', { timeout: 60000 });
        await page.click('button[title="Submit"]');
        console.log(`[Message]: 成功提交`);
        await page.waitFor(2000);
        results.succeedResult = await screenAndUploadToS3(user, 'succeed', page);
        console.log(`[Message]: 截圖已儲存 ${results.succeedResult.Location}`);
        await browser.close();
        await sendMail(results, null);
        console.log(`[Message]: Succeed.`);
        return;
    } catch (error) {
        console.log(`[Error]: ${error}`);
        const {
            user
        } = process.env;
        results.errorResult = await screenAndUploadToS3(user!, 'status', page!);
        await sendMail(results, error);
        process.exit(1);
    }
} 