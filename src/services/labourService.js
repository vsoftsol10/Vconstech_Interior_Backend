// src/services/labourService.js
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

// Get all labourers for a company
export const getAllLabourers = async (companyId, projectId = null) => {
  const where = { companyId };
  
  if (projectId) {
    where.projectId = parseInt(projectId);
  }

  const labourers = await prisma.labour.findMany({
    where,
    include: {
      payments: {
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          date: true,
          remarks: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Transform data to include totalPaid
  return labourers.map(labourer => {
    const totalPaid = labourer.payments.reduce((sum, payment) => 
      sum + Number(payment.amount), 0
    );
    
    return {
      ...labourer,
      totalPaid
    };
  });
};

// Get single labourer by ID
export const getLabourerById = async (id, companyId) => {
  const labourer = await prisma.labour.findFirst({
    where: {
      id,
      companyId
    },
    include: {
      payments: {
        orderBy: { date: 'desc' },
        select: {
          id: true,
          amount: true,
          date: true,
          remarks: true
        }
      }
    }
  });

  if (!labourer) return null;

  const totalPaid = labourer.payments.reduce((sum, payment) => 
    sum + Number(payment.amount), 0
  );

  return {
    ...labourer,
    totalPaid
  };
};

// Create new labourer
export const createLabourer = async (data) => {
  console.log('🔧 Service: Creating labourer with data:', data);
  
  const labourer = await prisma.labour.create({
    data: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      companyId: data.companyId,
      projectId: data.projectId
    },
    include: {
      payments: {
        select: {
          id: true,
          amount: true,
          date: true,
          remarks: true
        }
      }
    }
  });

  console.log('✅ Service: Labourer created:', labourer);

  return {
    ...labourer,
    totalPaid: 0
  };
};

// Update labourer
export const updateLabourer = async (id, companyId, data) => {
  const existing = await prisma.labour.findFirst({
    where: { id, companyId }
  });

  if (!existing) return null;

  const labourer = await prisma.labour.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      projectId: data.projectId
    },
    include: {
      payments: {
        orderBy: { date: 'desc' },
        select: {
          id: true,
          amount: true,
          date: true,
          remarks: true
        }
      }
    }
  });

  const totalPaid = labourer.payments.reduce((sum, payment) => 
    sum + Number(payment.amount), 0
  );

  return {
    ...labourer,
    totalPaid
  };
};

// Delete labourer
export const deleteLabourer = async (id, companyId) => {
  const existing = await prisma.labour.findFirst({
    where: { id, companyId }
  });

  if (!existing) return null;

  await prisma.labour.delete({
    where: { id }
  });

  return true;
};

// Add payment to labourer
export const addPayment = async (labourId, companyId, paymentData) => {
  const labourer = await prisma.labour.findFirst({
    where: {
      id: labourId,
      companyId
    }
  });

  if (!labourer) return null;

  const payment = await prisma.labourPayment.create({
    data: {
      labourId,
      amount: paymentData.amount,
      date: paymentData.date,
      remarks: paymentData.remarks
    }
  });

  return payment;
};

// Get all payments for a labourer
export const getLabourerPayments = async (labourId, companyId) => {
  const labourer = await prisma.labour.findFirst({
    where: {
      id: labourId,
      companyId
    }
  });

  if (!labourer) {
    throw new Error('Labourer not found or access denied');
  }

  const payments = await prisma.labourPayment.findMany({
    where: { labourId },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      amount: true,
      date: true,
      remarks: true,
      createdAt: true
    }
  });

  return payments;
};

// Delete payment
export const deletePayment = async (paymentId, labourId, companyId) => {
  const labourer = await prisma.labour.findFirst({
    where: {
      id: labourId,
      companyId
    }
  });

  if (!labourer) return null;

  const payment = await prisma.labourPayment.findFirst({
    where: {
      id: paymentId,
      labourId
    }
  });

  if (!payment) return null;

  await prisma.labourPayment.delete({
    where: { id: paymentId }
  });

  return true;
};

// Get labourers by project
export const getLabourersByProject = async (projectId, companyId) => {
  const labourers = await prisma.labour.findMany({
    where: {
      projectId,
      companyId
    },
    include: {
      payments: {
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          date: true,
          remarks: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return labourers.map(labourer => {
    const totalPaid = labourer.payments.reduce((sum, payment) => 
      sum + Number(payment.amount), 0
    );
    
    return {
      ...labourer,
      totalPaid
    };
  });
};

// Get labour statistics
export const getLabourStatistics = async (companyId, projectId = null) => {
  const where = { companyId };
  
  if (projectId) {
    where.projectId = projectId;
  }

  const totalLabourers = await prisma.labour.count({ where });

  const payments = await prisma.labourPayment.findMany({
    where: {
      labour: where
    },
    select: {
      amount: true,
      date: true
    }
  });

  const totalPaid = payments.reduce((sum, payment) => 
    sum + Number(payment.amount), 0
  );

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const paymentsThisMonth = payments.filter(
    payment => new Date(payment.date) >= firstDayOfMonth
  );
  
  const totalPaidThisMonth = paymentsThisMonth.reduce(
    (sum, payment) => sum + Number(payment.amount), 0
  );

  const labourersByProject = await prisma.labour.groupBy({
    by: ['projectId'],
    where: { companyId },
    _count: true
  });

  return {
    totalLabourers,
    totalPaid,
    totalPaidThisMonth,
    totalPayments: payments.length,
    paymentsThisMonth: paymentsThisMonth.length,
    labourersByProject: labourersByProject.map(item => ({
      projectId: item.projectId,
      count: item._count
    })),
    averagePaymentPerLabourer: totalLabourers > 0 
      ? (totalPaid / totalLabourers).toFixed(2) 
      : 0
  };
};