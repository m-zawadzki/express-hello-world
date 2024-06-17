const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const puppeteer = require("puppeteer");

function extractIdFromUrl(url) {
  const regex = /mecz\/([^\/]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
}

app.get("/get-match-details", async (req, res) => {
  try {
    const flashscoreUrl = req.query.url;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(flashscoreUrl);

    const home = await page.$eval(
      ".duelParticipant__home .participant__participantName .participant__overflow",
      (el) => el.textContent.trim()
    );
    const away = await page.$eval(
      ".duelParticipant__away .participant__participantName .participant__overflow",
      (el) => el.textContent.trim()
    );
    const tournamentHeader = await page.$eval(
      ".tournamentHeader__country a",
      (el) => el.textContent.trim()
    );
    const dateString = await page.$eval(".duelParticipant__startTime", (el) =>
      el.textContent.trim()
    );

    await browser.close();

    const flashScoreId = extractIdFromUrl(flashscoreUrl);

    if (!home || !away || !tournamentHeader || !flashScoreId || !dateString) {
      res.status(500).json({ error: "Błąd podczas pobierania danych" });
      return;
    }

    res
      .status(200)
      .json({ home, away, tournamentHeader, flashScoreId, dateString });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Błąd podczas ładowania danych: ${err.message}` });
  }
});

app.get("/get-match-result", async (req, res) => {
  try {
    const flashscoreId = req.query.id;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(
      `https://www.flashscore.pl/mecz/${flashscoreId}/#/szczegoly-meczu`
    );

    const result = await page.$eval(".detailScore__wrapper", (el) =>
      el.textContent.trim()
    );
    const [home, away] = result.split("-").map((score) => score.trim());
    await browser.close();

    if (!home || !away) {
      res.status(500).json({ error: "Mecz się jeszcze nie zakończył" });
      return;
    }

    res.status(200).json({ home: Number(home), away: Number(away) });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Błąd podczas ładowania danych: ${err.message}` });
  }
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
