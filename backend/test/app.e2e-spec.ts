import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

import {
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums';

describe('FIFISHOP - E2E SECURITE ET WORKFLOW', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminPassword = 'AdminE2E-2026!';
  const agentPassword = 'LivreurE2E-2026!';
  const customerPassword = 'ClientE2E-2026!';

  let adminId: string;
  let agent1Id: string;
  let agent2Id: string;
  let customerId: string;

  let orderNumber: string;

  let adminAgent: any;
  let customerAgent: any;
  let deliveryAgent1: any;
  let deliveryAgent2: any;

  let adminCsrf: string;
  let customerCsrf: string;
  let deliveryAgent1Csrf: string;
  let deliveryAgent2Csrf: string;

  async function getCsrf(agent: any): Promise<string> {
    const response = await agent.get('/api/v1/auth/csrf').expect(200);

    expect(response.body.csrfToken).toBeTruthy();

    return response.body.csrfToken;
  }

  async function login(agent: any, email: string, password: string) {
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({
        email,
        password,
      });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    return csrfToken;
  }

  beforeAll(async () => {
    /*
     * VERROU N°1 :
     * on refuse immédiatement toute base autre que
     * fifishop_e2e.
     */
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('SECURITE E2E : DATABASE_URL absent.');
    }

    const configuredDatabase = new URL(databaseUrl).pathname.replace(
      /^\/+/,
      '',
    );

    if (configuredDatabase !== 'fifishop_e2e') {
      throw new Error(`SECURITE E2E : tentative sur "${configuredDatabase}".`);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    /*
     * Reproduire le comportement de main.ts.
     */
    app.use(cookieParser());

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    /*
     * VERROU N°2 :
     * vérification auprès de PostgreSQL lui-même.
     */
    const result = await prisma.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;

    expect(result[0]?.current_database).toBe('fifishop_e2e');

    /*
     * Nettoyage autorisé UNIQUEMENT après les deux
     * contrôles précédents.
     */
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.orderAddress.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.deliveryZone.deleteMany();
    await prisma.user.deleteMany();

    /*
     * Comptes techniques E2E.
     */
    const admin = await prisma.user.create({
      data: {
        email: 'admin.e2e@fifishop.test',
        passwordHash: await argon2.hash(adminPassword),
        firstName: 'Admin',
        lastName: 'E2E',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    adminId = admin.id;

    const agent1 = await prisma.user.create({
      data: {
        email: 'livreur1.e2e@fifishop.test',
        passwordHash: await argon2.hash(agentPassword),
        firstName: 'Livreur',
        lastName: 'Un',
        role: UserRole.DELIVERY_AGENT,
        status: UserStatus.ACTIVE,
      },
    });

    agent1Id = agent1.id;

    const agent2 = await prisma.user.create({
      data: {
        email: 'livreur2.e2e@fifishop.test',
        passwordHash: await argon2.hash(agentPassword),
        firstName: 'Livreur',
        lastName: 'Deux',
        role: UserRole.DELIVERY_AGENT,
        status: UserStatus.ACTIVE,
      },
    });

    agent2Id = agent2.id;

    const customer = await prisma.user.create({
      data: {
        email: 'client.e2e@fifishop.test',
        passwordHash: await argon2.hash(customerPassword),
        firstName: 'Client',
        lastName: 'E2E',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    customerId = customer.id;

    /*
     * Commande métier dédiée aux tests livraison/COD.
     */
    orderNumber = `E2E-${Date.now()}`;

    await prisma.order.create({
      data: {
        orderNumber,
        userId: customerId,

        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.PENDING,

        subtotal: 15000,
        discountAmount: 0,
        deliveryFee: 2000,
        total: 17000,

        customerFirstName: 'Client',
        customerLastName: 'E2E',
        customerEmail: 'client.e2e@fifishop.test',
        customerPhone: '770000001',

        delivery: {
          create: {
            method: DeliveryMethod.HOME_DELIVERY,
            status: DeliveryStatus.READY,
            zone: 'Dakar E2E',
            fee: 2000,
          },
        },

        payments: {
          create: {
            method: PaymentMethod.CASH_ON_DELIVERY,
            status: PaymentStatus.PENDING,
            amount: 17000,
            currency: 'XOF',
          },
        },
      },
    });

    /*
     * Sessions E2E persistantes.
     * Une seule authentification par acteur pour éviter de tester
     * involontairement le rate limiter dans chaque scénario métier.
     */
    adminAgent = request.agent(app.getHttpServer());
    customerAgent = request.agent(app.getHttpServer());
    deliveryAgent1 = request.agent(app.getHttpServer());
    deliveryAgent2 = request.agent(app.getHttpServer());

    adminCsrf = await login(
      adminAgent,
      'admin.e2e@fifishop.test',
      adminPassword,
    );

    customerCsrf = await login(
      customerAgent,
      'client.e2e@fifishop.test',
      customerPassword,
    );

    deliveryAgent1Csrf = await login(
      deliveryAgent1,
      'livreur1.e2e@fifishop.test',
      agentPassword,
    );

    deliveryAgent2Csrf = await login(
      deliveryAgent2,
      'livreur2.e2e@fifishop.test',
      agentPassword,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuse une mutation sans token CSRF', async () => {
    const agent = request.agent(app.getHttpServer());

    const response = await agent.post('/api/v1/auth/login').send({
      email: 'client.e2e@fifishop.test',
      password: customerPassword,
    });

    expect(response.status).toBe(403);
  });

  it('autorise le login avec CSRF valide', async () => {
    const agent = request.agent(app.getHttpServer());

    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({
        email: 'client.e2e@fifishop.test',
        password: customerPassword,
      });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    expect(response.body.user.email).toBe('client.e2e@fifishop.test');
  });

  it('interdit les routes admin au client', async () => {
    await customerAgent.get('/api/v1/admin/orders').expect(403);
  });

  it('permet à l admin d affecter un livreur', async () => {
    const agent = request.agent(app.getHttpServer());

    const csrfToken = await login(
      agent,
      'admin.e2e@fifishop.test',
      adminPassword,
    );

    const response = await agent
      .patch(`/api/v1/admin/orders/${orderNumber}/delivery/assign`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        deliveryAgentId: agent1Id,
      });

    expect(response.status).toBe(200);
    expect(response.body.deliveryAgentId).toBe(agent1Id);

    const delivery = await prisma.delivery.findFirstOrThrow({
      where: {
        order: {
          orderNumber,
        },
      },
    });

    expect(delivery.deliveryAgentId).toBe(agent1Id);
  });

  it('interdit la route livraison admin au livreur', async () => {
    const response = await deliveryAgent1
      .patch(`/api/v1/admin/orders/${orderNumber}/delivery`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: DeliveryStatus.IN_TRANSIT,
      });

    expect(response.status).toBe(403);
  });

  it('le livreur voit uniquement ses livraisons', async () => {
    const own = await deliveryAgent1
      .get('/api/v1/delivery-agent/deliveries')
      .expect(200);

    expect(JSON.stringify(own.body)).toContain(orderNumber);

    const other = await deliveryAgent2
      .get('/api/v1/delivery-agent/deliveries')
      .expect(200);

    expect(JSON.stringify(other.body)).not.toContain(orderNumber);
  });

  it('empêche un autre livreur d accéder à la livraison', async () => {
    const response = await deliveryAgent2.get(
      `/api/v1/delivery-agent/deliveries/${orderNumber}`,
    );

    expect([403, 404]).toContain(response.status);
  });

  it('interdit au livreur d annuler une livraison', async () => {
    const response = await deliveryAgent1
      .patch(`/api/v1/delivery-agent/deliveries/${orderNumber}`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: DeliveryStatus.CANCELLED,
        notes: 'Tentative E2E interdite',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('refuse COD PAID avant livraison', async () => {
    const response = await adminAgent
      .patch(`/api/v1/admin/orders/${orderNumber}/payment/cash-on-delivery`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: PaymentStatus.PAID,
        note: 'Paiement E2E prématuré',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);

    const payment = await prisma.payment.findFirstOrThrow({
      where: {
        order: {
          orderNumber,
        },
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
    });

    expect(payment.status).toBe(PaymentStatus.PENDING);
  });

  it('synchronise livraison IN_TRANSIT avec commande SHIPPED', async () => {
    const response = await deliveryAgent1
      .patch(`/api/v1/delivery-agent/deliveries/${orderNumber}`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: DeliveryStatus.IN_TRANSIT,
        notes: 'Départ livraison E2E',
      });

    expect(response.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({
      where: {
        orderNumber,
      },
    });

    expect(order.status).toBe(OrderStatus.SHIPPED);
  });

  it('synchronise DELIVERED avec la commande', async () => {
    const response = await deliveryAgent1
      .patch(`/api/v1/delivery-agent/deliveries/${orderNumber}`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: DeliveryStatus.DELIVERED,
        notes: 'Livraison E2E terminée',
      });

    expect(response.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({
      where: {
        orderNumber,
      },
      include: {
        delivery: true,
      },
    });

    expect(order.status).toBe(OrderStatus.DELIVERED);

    expect(order.delivery?.status).toBe(DeliveryStatus.DELIVERED);

    expect(order.delivery?.deliveredAt).toBeTruthy();
  });

  it('autorise COD PAID après livraison', async () => {
    const response = await adminAgent
      .patch(`/api/v1/admin/orders/${orderNumber}/payment/cash-on-delivery`)
      .set('x-csrf-token', deliveryAgent1Csrf)
      .send({
        status: PaymentStatus.PAID,
        note: 'COD confirmé E2E',
      });

    expect(response.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({
      where: {
        orderNumber,
      },
    });

    expect(order.paymentStatus).toBe(PaymentStatus.PAID);

    const payment = await prisma.payment.findFirstOrThrow({
      where: {
        orderId: order.id,
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
    });

    expect(payment.status).toBe(PaymentStatus.PAID);

    expect(payment.paidAt).toBeTruthy();
  });

  it('crée des AuditLog sans journaliser les secrets', async () => {
    /*
     * L'interceptor écrit l'audit de manière
     * asynchrone. Petite attente volontaire.
     */
    await new Promise((resolve) => setTimeout(resolve, 250));

    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });

    expect(logs.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(logs).toLowerCase();

    expect(serialized).not.toContain(adminPassword.toLowerCase());

    expect(serialized).not.toContain(agentPassword.toLowerCase());

    expect(serialized).not.toContain(customerPassword.toLowerCase());

    expect(serialized).not.toContain('"authorization"');

    expect(serialized).not.toContain('"password"');

    expect(serialized).not.toContain('"accesstoken"');

    expect(serialized).not.toContain('"refreshtoken"');
  });

  it('confirme que les tests tournent toujours sur fifishop_e2e', async () => {
    const result = await prisma.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;

    expect(result[0]?.current_database).toBe('fifishop_e2e');

    expect(adminId).toBeTruthy();
    expect(agent1Id).toBeTruthy();
    expect(agent2Id).toBeTruthy();
    expect(customerId).toBeTruthy();
  });
});
