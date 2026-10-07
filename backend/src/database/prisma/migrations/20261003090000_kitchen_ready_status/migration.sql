-- READY: the kitchen has finished cooking/packing an order — it sits between
-- PREPARING and OUT_FOR_DELIVERY/DELIVERED. Shown to customers as "Ready for
-- delivery" / "Ready for pickup" / "Ready to serve" depending on the order type.
ALTER TYPE "OrderStatus" ADD VALUE 'READY' AFTER 'PREPARING';

-- The Kitchen screen: a SUPER_ADMIN-granted feature (off for every tenant —
-- no tenant_features rows) and two permissions.
INSERT INTO "features" ("id", "key", "name", "description")
VALUES (
  gen_random_uuid()::text,
  'kitchen-display',
  'Kitchen Display',
  'A Kitchen screen for chefs and staff: today''s (or any upcoming day''s) orders and plan deliveries with search and filters, a prep summary, and Start / Mark ready buttons. Off by default.'
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "permissions" ("id", "key", "description", "category")
VALUES
  (
    gen_random_uuid()::text,
    'kitchen.view',
    'Open the Kitchen screen — see the day''s orders, plan deliveries and prep summary (customer phone/email stay hidden unless they can also manage orders)',
    'operations'
  ),
  (
    gen_random_uuid()::text,
    'kitchen.update',
    'Start preparing an order and mark it ready from the Kitchen screen',
    'operations'
  )
ON CONFLICT ("key") DO NOTHING;

-- Every existing business's OWNER gets both, same as a new tenant's OWNER
-- gets every permission at creation. Nothing shows until SUPER_ADMIN turns
-- the feature on.
INSERT INTO "role_permissions" ("id", "tenantId", "role", "permissionId", "granted", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'OWNER', p."id", true, now()
FROM "tenants" t
CROSS JOIN "permissions" p
WHERE p."key" IN ('kitchen.view', 'kitchen.update')
ON CONFLICT ("tenantId", "role", "permissionId") DO NOTHING;
