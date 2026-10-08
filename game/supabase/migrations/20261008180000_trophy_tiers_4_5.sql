-- Platinum and Diamond trophy tiers: adds their rewards to the catalog the ledger checks against.

-- BEGIN GENERATED CATALOG

insert into public.catalog_items (kind, id, price) values
  ('skin', 'classic', 0),
  ('skin', 'ember', 40),
  ('skin', 'mint', 80),
  ('skin', 'aqua', 120),
  ('skin', 'gold', 150),
  ('skin', 'cherry', 200),
  ('skin', 'violet', 250),
  ('skin', 'lime', 320),
  ('skin', 'ice', 400),
  ('skin', 'rose', 600),
  ('skin', 'galaxy', 750),
  ('skin', 'void', 900),
  ('skin', 'aurora', 1100),
  ('skin', 'sun', 1500),
  ('skin', 'obsidian', 2000),
  ('trail', 'classic', 0),
  ('trail', 'pixel', 120),
  ('trail', 'bubbles', 180),
  ('trail', 'ghost', 220),
  ('trail', 'sparkle', 350),
  ('trail', 'flame', 450),
  ('trail', 'comet', 550),
  ('trail', 'rainbow', 850),
  ('theme', 'classic', 0),
  ('theme', 'candy', 160),
  ('theme', 'lava', 300),
  ('theme', 'iceworld', 450),
  ('theme', 'neon', 700),
  ('theme', 'mono', 1000)
on conflict (kind, id) do update set price = excluded.price;

insert into public.catalog_upgrades (id, level, cost) values
  ('sturdy', 1, 120),
  ('sturdy', 2, 300),
  ('sturdy', 3, 600),
  ('sturdy', 4, 1000),
  ('magnet', 1, 100),
  ('magnet', 2, 250),
  ('magnet', 3, 500),
  ('fever', 1, 150),
  ('fever', 2, 350),
  ('fever', 3, 700),
  ('lucky', 1, 150),
  ('lucky', 2, 400),
  ('lucky', 3, 800),
  ('shield', 1, 900)
on conflict (id, level) do update set cost = excluded.cost;

insert into public.catalog_boosts (id, price) values
  ('shield', 120),
  ('coins2x', 150),
  ('headStart', 200)
on conflict (id) do update set price = excluded.price;

insert into public.catalog_bundles (id, discount) values
  ('starter', 0.5),
  ('speed', 0.4),
  ('collector', 0.35)
on conflict (id) do update set discount = excluded.discount;

insert into public.catalog_bundle_items (bundle_id, kind, item_id) values
  ('starter', 'skin', 'ember'),
  ('starter', 'trail', 'pixel'),
  ('starter', 'theme', 'candy'),
  ('speed', 'skin', 'cherry'),
  ('speed', 'trail', 'flame'),
  ('speed', 'theme', 'lava'),
  ('collector', 'skin', 'galaxy'),
  ('collector', 'skin', 'aurora'),
  ('collector', 'trail', 'rainbow'),
  ('collector', 'theme', 'neon')
on conflict (bundle_id, kind, item_id) do nothing;

insert into public.catalog_settings (key, value) values
  ('deal_discount', 0.5),
  ('box_price', 250),
  ('trophy_tier_1', 25),
  ('trophy_tier_2', 75),
  ('trophy_tier_3', 200),
  ('trophy_tier_4', 400),
  ('trophy_tier_5', 750)
on conflict (key) do update set value = excluded.value;

-- END GENERATED CATALOG
