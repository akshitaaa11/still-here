# FACTCHECK.md (Phase 0)

**Method and limit:** This session's network blocks the NASA, JPL, Astronomy and HiRISE hosts, so none of the source pages could be opened. Everything below comes from web-search result summaries. Every URL in `cards.json` appeared in a search result. **The human should open each link once before submitting.**

## The 4 CHECK items

| # | Item | Result | What shipped |
|---|------|--------|--------------|
| 1 | Apollo 15 ALSEP instruments | Search shows the Apollo 15 package had passive seismic, magnetometer, solar wind spectrometer, suprathermal ion detector, cold cathode gauge and heat flow experiments (NASA ALSJ mission report). Not read directly from the page. | **Fallback used.** No instruments are listed. The card says only that the station "ran on its own and sent data to Earth by radio". |
| 2 | Fingernail comparison | Only found on one low-quality aggregator site. The 3.8 cm/year figure itself is well supported (JPL). | **Fallback used.** The comparison is omitted. |
| 3 | Cone and parachute wording, 440 metres | **Not verified.** No search result gave a distance. NASA/HiRISE describe the "cone-shaped backshell" and the parachute lying southwest of Eagle Crater, with the platform still inside the crater. | **Fallback used.** The 440 m figure is dropped. Long text now says they "landed a short way from the platform". That wording is mine, not NASA's. |
| 4 | Space rock wording | **Verified.** JPL (Jan 2005): spectrometers showed the pitted, basketball-sized rock is mostly iron and nickel. It lies near the rover's heat shield debris and is nicknamed Heat Shield Rock. It was the first meteorite identified on another planet. | Approved text kept. "Scientists think" wording kept. |

## Source URLs (all in `cards.json`)

| Card | URL | Status |
|------|-----|--------|
| landing_stage, flag | https://webarchive.library.unt.edu/eot2008/20090120064513/http://www.nasa.gov/missions/solarsystem/f_leftovers.html | Real (archived NASA "Apollo's Lunar Leftovers", 2004). Page not opened. |
| science_station | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a15/a15mr-4.htm | Real (Apollo 15 report, lunar surface science). Not opened. |
| laser_mirror | https://jpl.nasa.gov/news/the-apollo-experiment-that-keeps-on-giving/ | Real. 3.8 cm/year supported by this result set. |
| rover_sign | https://www.astronomy.com/observing/a-car-for-the-moon-the-lunar-roving-vehicle/ | Real. Only a teaser was seen. |
| landing_platform, cone_parachute | https://www.nasa.gov/image-article/rovers-landing-hardware-eagle-crater-mars | Real. |
| heat_shield, space_rock | https://www.jpl.nasa.gov/news/opportunity-rover-finds-an-iron-meteorite-on-mars/ | Real. Covers the rock. Only partly covers the heat shield card. |

The README also lists HiRISE (`https://www.uahirise.org/ESP_050177_1780`, "What Opportunity Left Behind") and a Space.com article. The HiRISE URL is real but unused, because I couldn't confirm what it says about the heat shield. I could not find a Space.com URL. All `verified` flags are `true` because the URLs are real, but see "Still unverified" for claims.

## Still unverified (README text kept verbatim; please confirm)
- "5 km an hour" typical rover speed, and "on Apollo 16 all four wheels once left the ground".
- Rover plaque "delivered by Falcon on 30 July 1971" (the landing date; first drive was 31 July). Only the 31 July first use was seen in search.
- ALSEP flown on Apollo 12, 14, 15, 16, 17 (Apollo 11 had a different, smaller package).
- Laser mirrors on Apollo 11, 14, 15 (in the long text; not directly checked).
- Opportunity landing in January 2004, 90 Mars days, about 14.5 years, 10 June 2018 last message, over 1,000 commands (ending text). Widely known, not checked here.
- "Spacecraft circling Mars can still see it today": consistent with the 2017 HiRISE image of the platform in Eagle Crater.
- Heat shield "broke into two pieces" and Opportunity "drove to it".
