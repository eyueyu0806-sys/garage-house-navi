# Municipality names

`municipalities.json` is derived from [Geolonia Japanese Addresses](https://github.com/geolonia/japanese-addresses), [prefecture/municipality JSON](https://geolonia.github.io/japanese-addresses/api/ja.json), retrieved 2026-10-11 (JST).

Attribution: 株式会社Geolonia. Data license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream sources include the Ministry of Land, Infrastructure, Transport and Tourism's location reference information and Japan Post postal data.

Changes: names only; designated-city wards collapsed into the parent city; duplicates removed; longest names first. Ward and street text remain in the property address. No coordinates or street-level data are included. The data is bundled and used only on the server; saving does not depend on an external API.

The original data series is no longer updated. On a municipality merger or an unrecognized name, update this snapshot from maintained municipality data (the upstream project links to [v2](https://github.com/geolonia/japanese-addresses-v2)). Unknown names produce a clear validation error rather than guessing a location. Existing unchanged addresses are preserved on edits.
