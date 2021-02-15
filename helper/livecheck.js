const puppeteer = require('puppeteer');

module.exports = {
    fPCS: function (who) {
        return fCS(who)
    }
};

const fCS = async(User) => {
    const browser = await puppeteer.launch({headless:true});
    const page = await browser.newPage();
    await page.goto('http://twitch.com/' + User, {waitUntil:"networkidle2", timeout:0});
    const CheckUserStatus = await page.evaluate(()=>{
        try{
            const OfflineCheck = document.getElementsByClassName('channel-status-info channel-status-info--offline tw-border-radius-medium tw-inline-block')[0];
            const OnlineCheck = document.getElementsByClassName('tw-strong tw-upcase tw-white-space-nowrap')[0];
            
            if (!OfflineCheck && !OnlineCheck) {
                return {error: "User not Found"}
            } else if (OfflineCheck) {
                return {online:false , error:false}
            } else if (OnlineCheck) {
                const viewers = document.querySelector("p[data-a-target='animated-channel-viewers-count']").innerText;
                const streamtime = document.getElementsByClassName('live-time')[0].innerText;
                const title = document.querySelector("h2[data-a-target]").innerText;
                const game = document.querySelector("a[data-a-target=stream-game-link] span").innerText;
                return {online:true, viewers, streamtime, title, game, error:false}
            }
        } catch(e) {
            console.log('Error 504 Try Again')
        }
    })
      
    browser.close();
    return CheckUserStatus
}; 