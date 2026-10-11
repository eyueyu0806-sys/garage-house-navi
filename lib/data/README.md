# Municipality names

## Osaka map

`osaka-map.json` contains simplified, projected SVG geometry for all 43 municipalities; `osaka-cities.json` contains names, codes and exact search aliases. Both are derived from [国土交通省「国土数値情報（行政区域）」](https://nlftp.mlit.go.jp/ksj/), 2021-01-01, via [SmartNews Media Research Institute japan-topography](https://github.com/smartnews-smri/japan-topography). Source: `data/municipality/geojson/s0010/N03-21_27_210101.json`, Git blob `f1bb949aa6282d4ac50f29da7f545fb7487fe66b`, retrieved 2026-10-12 JST. [Original data use terms](https://nlftp.mlit.go.jp/ksj/other/agreement.html). Attribution is displayed beside the map. This is a simplified area-selection illustration, not cadastral data or an assertion of current exact boundaries.

Changes: merge Osaka/Sakai wards, retain islands, project longitude at latitude 34.6°, flip latitude for SVG, round to 0.1 viewBox units. No runtime map service, credentials or map tracking. Only the small zoom-control wrapper uses client JavaScript; geography and links are rendered on the server. Regenerate with `python scripts/build-osaka-map.py /path/to/source.json` (Python + Shapely 2.2.0). Names/coverage checked against the bundled municipality snapshot and [Osaka Prefecture's 43-municipality overview](https://www.pref.osaka.lg.jp/o040060/shinko/shichoson_gaiyou/index.html). Check boundary/name updates before replacing this snapshot. Exact search aliases include ward/county/prefecture legacy forms; no wildcard matching or saved-address edits.

`municipalities.json` is derived from [Geolonia Japanese Addresses](https://github.com/geolonia/japanese-addresses), [prefecture/municipality JSON](https://geolonia.github.io/japanese-addresses/api/ja.json), retrieved 2026-10-11 (JST).

Attribution: 株式会社Geolonia. Data license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream sources include the Ministry of Land, Infrastructure, Transport and Tourism's location reference information and Japan Post postal data.

Changes: names only; designated-city wards collapsed into the parent city; duplicates removed; longest names first. Ward and street text remain in the property address. No coordinates or street-level data are included. The data is bundled and used only on the server; saving does not depend on an external API.

The original data series is no longer updated. On a municipality merger or an unrecognized name, update this snapshot from maintained municipality data (the upstream project links to [v2](https://github.com/geolonia/japanese-addresses-v2)). Unknown names produce a clear validation error rather than guessing a location. Existing unchanged addresses are preserved on edits.
