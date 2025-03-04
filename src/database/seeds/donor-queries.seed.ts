import { PrismaClient, QueryMode, QueryStatus, UserRole } from '@prisma/client';

export const donorQueriesSeed = async (prisma: PrismaClient): Promise<void> => {
  // Get admin users for transfers
  const superAdminUsers = await prisma.user.findMany({ where: { role: UserRole.SUPER_ADMIN } });
  const adminUsers = await prisma.user.findMany({ where: { role: UserRole.ADMIN } });
  
  // Clear existing data
  await prisma.donorQuery.deleteMany({});
  
  // General Queries (In Progress and Pending Reply)
  const generalQueries = [
    {
      sid: "1",
      donor: "John Doe",
      donorId: "12345",
      test: "Demo PR Saliva Kit",
      stage: "PIP Step 1",
      queryMode: QueryMode.TEXT,
      device: "Windows 11 Pro",
      status: QueryStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-15T10:00:00"),
    },
    {
      sid: "2",
      donor: "Jane Doe",
      donorId: "12346",
      test: "Demo PR Blood Kit",
      stage: "Clear View Confirmation",
      queryMode: QueryMode.HUDDLE,
      device: "Macbook M1 Pro",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T11:30:00"),
    },
    {
      sid: "3",
      donor: "John Smith",
      donorId: "12347",
      test: "PR Nail Kit",
      stage: "Step 2 - Clear Mouth",
      queryMode: QueryMode.VIDEO_CALL,
      device: "iPhone 16 Pro Max",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T12:45:00"),
    },
    {
      sid: "4",
      donor: "Sarah Wilson",
      donorId: "12348",
      test: "Demo PR Saliva Kit (Intercept)",
      stage: "Step 4 - Prepare the Collection",
      queryMode: QueryMode.TEXT,
      device: "Samsung Galaxy S24 Ultra",
      status: QueryStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-15T13:15:00"),
    },
    {
      sid: "5",
      donor: "Michael Brown",
      donorId: "12349",
      test: "Demo PR Blood Kit",
      stage: "Step 10 - Verify and Capture Specimen",
      queryMode: QueryMode.HUDDLE,
      device: "MacBook Air M2",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T14:20:00"),
    },
    {
      sid: "6",
      donor: "Emily Davis",
      donorId: "12350",
      test: "PR Nail Kit",
      stage: "Clear View Confirmation",
      queryMode: QueryMode.VIDEO_CALL,
      device: "iPad Pro M2",
      status: QueryStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-15T15:00:00"),
    },
    {
      sid: "7",
      donor: "David Miller",
      donorId: "12351",
      test: "Demo PR Saliva Kit (Intercept)",
      stage: "Step 2 - Clear Mouth",
      queryMode: QueryMode.TEXT,
      device: "Google Pixel 8 Pro",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T15:45:00"),
    },
    {
      sid: "8",
      donor: "Lisa Anderson",
      donorId: "12352",
      test: "Demo PR Blood Kit",
      stage: "Step 4 - Prepare the Collection",
      queryMode: QueryMode.HUDDLE,
      device: "Mac Studio M2 Ultra",
      status: QueryStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-15T16:30:00"),
    },
    {
      sid: "9",
      donor: "James Wilson",
      donorId: "12353",
      test: "PR Nail Kit",
      stage: "Step 10 - Verify and Capture Specimen",
      queryMode: QueryMode.VIDEO_CALL,
      device: "Surface Laptop 5",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T17:15:00"),
    },
    {
      sid: "10",
      donor: "Emma Thompson",
      donorId: "12354",
      test: "Demo PR Saliva Kit",
      stage: "PIP Step 1",
      queryMode: QueryMode.TEXT,
      device: "iPhone 15 Pro",
      status: QueryStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-15T18:00:00"),
    },
    {
      sid: "11",
      donor: "Robert Clark",
      donorId: "12355",
      test: "Demo PR Saliva Kit (Intercept)",
      stage: "Clear View Confirmation",
      queryMode: QueryMode.HUDDLE,
      device: "Ubuntu Linux 22.04",
      status: QueryStatus.PENDING_REPLY,
      createdAt: new Date("2024-03-15T18:45:00"),
    },
  ];

  // Resolved Queries
  const resolvedQueries = [
    {
      sid: "12",
      donor: "John Doe",
      donorId: "12345",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.TEXT,
      device: "Windows 11 Pro",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-15T10:00:00"),
    },
    {
      sid: "13",
      donor: "Jane Doe",
      donorId: "12346",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.HUDDLE,
      device: "Macbook M1 Pro",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-15T11:30:00"),
    },
    {
      sid: "14",
      donor: "John Smith",
      donorId: "12347",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.VIDEO_CALL,
      device: "iPhone 16 Pro Max",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-15T12:45:00"),
    },
    {
      sid: "15",
      donor: "Sarah Wilson",
      donorId: "12348",
      test: "Blood Test",
      stage: "Follow-up",
      queryMode: QueryMode.TEXT,
      device: "Samsung Galaxy S24 Ultra",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-15T13:15:00"),
    },
    {
      sid: "16",
      donor: "Michael Brown",
      donorId: "12349",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.HUDDLE,
      device: "MacBook Air M2",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-15T14:20:00"),
    },
    {
      sid: "17",
      donor: "Michael Brown",
      donorId: "12354",
      test: "Demo PR Saliva Kit",
      stage: "PIP Step 3",
      queryMode: QueryMode.TEXT,
      device: "Android 14",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-14T09:15:00"),
    },
    {
      sid: "18",
      donor: "Emily Wilson",
      donorId: "12355",
      test: "Demo PR Blood Kit",
      stage: "Step 1 - Preparation",
      queryMode: QueryMode.HUDDLE,
      device: "iPad Pro",
      status: QueryStatus.RESOLVED,
      createdAt: new Date("2024-03-14T10:30:00"),
    },
  ];

  // Transferred Queries
  const transferredQueries = [
    {
      sid: "19",
      donor: "John Doe",
      donorId: "12345",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.TEXT,
      device: "Windows 11 Pro",
      status: QueryStatus.TRANSFERRED,
      transferredTo: "Dr. Smith",
      createdAt: new Date("2024-03-15T10:00:00"),
    },
    {
      sid: "20",
      donor: "Jane Doe",
      donorId: "12346",
      test: "Blood Test",
      stage: "Initial",
      queryMode: QueryMode.HUDDLE,
      device: "Macbook M1 Pro",
      status: QueryStatus.TRANSFERRED,
      transferredTo: "Dr. Johnson",
      createdAt: new Date("2024-03-15T11:30:00"),
    },
  ];

  // Insert general queries
  for (const query of generalQueries) {
    await prisma.donorQuery.create({
      data: query,
    });
  }

  // Insert resolved queries with resolvedById if admin users exist
  for (const [index, query] of resolvedQueries.entries()) {
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[index % adminUsers.length];
      await prisma.donorQuery.create({
        data: {
          ...query,
          resolvedById: adminUser.id,
        },
      });
    } else {
      await prisma.donorQuery.create({
        data: query,
      });
    }
  }

  // Insert transferred queries with transferredToUserId if superAdmin users exist
  for (const [index, query] of transferredQueries.entries()) {
    if (superAdminUsers.length > 0) {
      const superAdminUser = superAdminUsers[index % superAdminUsers.length];
      await prisma.donorQuery.create({
        data: {
          ...query,
          transferredToUserId: superAdminUser.id,
          transferredTo: superAdminUser.name,
        },
      });
    } else {
      await prisma.donorQuery.create({
        data: query,
      });
    }
  }

  console.log('Donor queries seed completed');
}; 