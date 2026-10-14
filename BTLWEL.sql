-- ============================================================
-- MedCare Pharmacy - SQL Server Database Schema (Complete)
-- Database : MedCarePharmacyDB
-- Engine   : SQL Server / LocalDB
-- Synced with Entity Framework Core entities (Models/Entities)
-- ============================================================

IF DB_ID(N'MedCarePharmacyDB') IS NOT NULL
BEGIN
    ALTER DATABASE MedCarePharmacyDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MedCarePharmacyDB;
END
GO

CREATE DATABASE MedCarePharmacyDB;
GO

USE MedCarePharmacyDB;
GO

-- ------------------------------------------------------------
-- 1. User
-- ------------------------------------------------------------
CREATE TABLE [User] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    FullName        NVARCHAR(150)   NOT NULL,
    Phone           VARCHAR(20)     NOT NULL,
    Email           VARCHAR(150)    NOT NULL,
    PasswordHash    NVARCHAR(MAX)   NOT NULL,
    Role            VARCHAR(50)     NOT NULL CONSTRAINT DF_User_Role DEFAULT ('customer'),
    Status          VARCHAR(50)     NOT NULL CONSTRAINT DF_User_Status DEFAULT ('Active'),
    AvatarUrl       NVARCHAR(MAX)   NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_User_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_User PRIMARY KEY (Id),
    CONSTRAINT UQ_User_Email UNIQUE (Email)
);
GO

-- ------------------------------------------------------------
-- 2. Category
-- ------------------------------------------------------------
CREATE TABLE [Category] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    Name            NVARCHAR(150)   NOT NULL,
    [Description]   NVARCHAR(MAX)   NULL,
    CONSTRAINT PK_Category PRIMARY KEY (Id)
);
GO

-- ------------------------------------------------------------
-- 3. Supplier
-- ------------------------------------------------------------
CREATE TABLE [Supplier] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    Name            NVARCHAR(200)   NOT NULL,
    Phone           VARCHAR(20)     NULL,
    Email           VARCHAR(150)    NULL,
    Address         NVARCHAR(300)   NULL,
    Status          VARCHAR(50)     NOT NULL CONSTRAINT DF_Supplier_Status DEFAULT ('Active'),
    CONSTRAINT PK_Supplier PRIMARY KEY (Id)
);
GO

-- ------------------------------------------------------------
-- 4. Product
-- ------------------------------------------------------------
CREATE TABLE [Product] (
    Id                  INT             IDENTITY(1,1) NOT NULL,
    Name                NVARCHAR(200)   NOT NULL,
    ActiveIngredient    NVARCHAR(200)   NULL,
    Price               DECIMAL(18,2)   NOT NULL,
    StockQuantity       INT             NOT NULL CONSTRAINT DF_Product_StockQuantity DEFAULT (0),
    Unit                NVARCHAR(50)    NOT NULL CONSTRAINT DF_Product_Unit DEFAULT (N'Hộp'),
    [Description]       NVARCHAR(MAX)   NULL,
    ImageUrl            NVARCHAR(MAX)   NULL,
    CategoryId          INT             NULL,
    SupplierId          INT             NULL,
    CONSTRAINT PK_Product PRIMARY KEY (Id),
    CONSTRAINT FK_Product_Category FOREIGN KEY (CategoryId)
        REFERENCES [Category](Id) ON DELETE SET NULL,
    CONSTRAINT FK_Product_Supplier FOREIGN KEY (SupplierId)
        REFERENCES [Supplier](Id) ON DELETE SET NULL
);
GO

-- ------------------------------------------------------------
-- 5. InventoryBatch
-- ------------------------------------------------------------
CREATE TABLE [InventoryBatch] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    ProductId       INT             NOT NULL,
    LotNumber       VARCHAR(100)    NOT NULL,
    Quantity        INT             NOT NULL,
    MfgDate         DATETIME2       NOT NULL,
    ExpDate         DATETIME2       NOT NULL,
    ImportPrice     DECIMAL(18,2)   NOT NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_InventoryBatch_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_InventoryBatch PRIMARY KEY (Id),
    CONSTRAINT FK_InventoryBatch_Product FOREIGN KEY (ProductId)
        REFERENCES [Product](Id) ON DELETE CASCADE
);
GO

-- ------------------------------------------------------------
-- 6. Order
-- ------------------------------------------------------------
CREATE TABLE [Order] (
    Id                  INT             IDENTITY(1,1) NOT NULL,
    UserId              INT             NULL,
    CustomerName        NVARCHAR(150)   NOT NULL,
    Phone               VARCHAR(20)     NOT NULL,
    Address             NVARCHAR(300)   NOT NULL,
    OrderType           VARCHAR(50)     NOT NULL CONSTRAINT DF_Order_OrderType DEFAULT ('Online'),
    Status              VARCHAR(50)     NOT NULL CONSTRAINT DF_Order_Status DEFAULT ('Pending'),
    PrescriptionUrl     NVARCHAR(MAX)   NULL,
    TotalAmount         DECIMAL(18,2)   NOT NULL,
    CreatedAt           DATETIME2       NOT NULL CONSTRAINT DF_Order_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_Order PRIMARY KEY (Id),
    CONSTRAINT FK_Order_User FOREIGN KEY (UserId)
        REFERENCES [User](Id) ON DELETE SET NULL
);
GO

-- ------------------------------------------------------------
-- 7. OrderDetail
-- ------------------------------------------------------------
CREATE TABLE [OrderDetail] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    OrderId         INT             NOT NULL,
    ProductId       INT             NOT NULL,
    Quantity        INT             NOT NULL,
    UnitPrice       DECIMAL(18,2)   NOT NULL,
    CONSTRAINT PK_OrderDetail PRIMARY KEY (Id),
    CONSTRAINT FK_OrderDetail_Order FOREIGN KEY (OrderId)
        REFERENCES [Order](Id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderDetail_Product FOREIGN KEY (ProductId)
        REFERENCES [Product](Id) ON DELETE CASCADE
);
GO

-- ------------------------------------------------------------
-- 8. ChatMessage
-- ------------------------------------------------------------
CREATE TABLE [ChatMessage] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    SenderId        INT             NOT NULL,
    ReceiverId      INT             NOT NULL,
    Content         NVARCHAR(MAX)   NOT NULL,
    ImageUrl        NVARCHAR(MAX)   NULL,
    Timestamp       DATETIME2       NOT NULL CONSTRAINT DF_ChatMessage_Timestamp DEFAULT (GETDATE()),
    IsRead          BIT             NOT NULL CONSTRAINT DF_ChatMessage_IsRead DEFAULT (0),
    CONSTRAINT PK_ChatMessage PRIMARY KEY (Id),
    CONSTRAINT FK_ChatMessage_Sender FOREIGN KEY (SenderId)
        REFERENCES [User](Id) ON DELETE NO ACTION,
    CONSTRAINT FK_ChatMessage_Receiver FOREIGN KEY (ReceiverId)
        REFERENCES [User](Id) ON DELETE NO ACTION
);
GO

-- ------------------------------------------------------------
-- 9. Prescription
-- ------------------------------------------------------------
CREATE TABLE [Prescription] (
    Id              INT             IDENTITY(1,1) NOT NULL,
    UserId          INT             NOT NULL,
    FileName        NVARCHAR(255)   NOT NULL,
    FileUrl         NVARCHAR(MAX)   NOT NULL,
    FileType        VARCHAR(20)     NOT NULL CONSTRAINT DF_Prescription_FileType DEFAULT ('image'),
    UploadedAt      DATETIME2       NOT NULL CONSTRAINT DF_Prescription_UploadedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_Prescription PRIMARY KEY (Id),
    CONSTRAINT FK_Prescription_User FOREIGN KEY (UserId)
        REFERENCES [User](Id) ON DELETE CASCADE
);
GO

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IX_Product_CategoryId       ON [Product](CategoryId);
CREATE INDEX IX_Product_SupplierId       ON [Product](SupplierId);
CREATE INDEX IX_InventoryBatch_ProductId ON [InventoryBatch](ProductId);
CREATE INDEX IX_Order_UserId             ON [Order](UserId);
CREATE INDEX IX_Order_Status             ON [Order](Status);
CREATE INDEX IX_OrderDetail_OrderId      ON [OrderDetail](OrderId);
CREATE INDEX IX_OrderDetail_ProductId    ON [OrderDetail](ProductId);
CREATE INDEX IX_ChatMessage_SenderId     ON [ChatMessage](SenderId);
CREATE INDEX IX_ChatMessage_ReceiverId   ON [ChatMessage](ReceiverId);
CREATE INDEX IX_Prescription_UserId      ON [Prescription](UserId);
GO

-- ============================================================
-- SAMPLE DATA
-- Demo accounts – password: 123456
-- AuthController có fallback so sánh plain-text khi BCrypt fail,
-- nên các tài khoản này đăng nhập được ngay.
-- ============================================================

INSERT INTO [User] (FullName, Phone, Email, PasswordHash, Role, Status, AvatarUrl) VALUES
(N'Admin MedCare',          '0901000001', 'admin@medcare.vn',       '123456', 'admin',      'Active', NULL),
(N'Dược sĩ Nguyễn Văn A',   '0901000002', 'pharmacist@medcare.vn',  '123456', 'pharmacist', 'Active', NULL),
(N'Khách hàng Trần Thị B',  '0901000003', 'customer@medcare.vn',    '123456', 'customer',   'Active', NULL);
GO

INSERT INTO [Category] (Name, [Description]) VALUES
(N'Thuốc kháng sinh',       N'Các loại kháng sinh phổ biến'),
(N'Thuốc giảm đau',         N'Giảm đau, hạ sốt'),
(N'Thuốc cảm cúm',          N'Điều trị cảm lạnh, cúm'),
(N'Thực phẩm chức năng',    N'Vitamin, khoáng chất, hỗ trợ sức khỏe'),
(N'Thiết bị y tế',          N'Máy đo huyết áp, nhiệt kế, khẩu trang...');
GO

INSERT INTO [Supplier] (Name, Phone, Email, Address, Status) VALUES
(N'Dược phẩm Hậu Giang', '02923891000', 'contact@dhgpharma.com.vn', N'Cần Thơ',          'Active'),
(N'Imexpharm',           '02723821000', 'info@imexpharm.com',       N'Đồng Tháp',        'Active'),
(N'Stada Việt Nam',      '02838221234', 'info@stada.vn',            N'TP. Hồ Chí Minh',  'Active');
GO

INSERT INTO [Product] (Name, ActiveIngredient, Price, StockQuantity, Unit, [Description], ImageUrl, CategoryId, SupplierId) VALUES
(N'Amoxicillin 500mg',  N'Amoxicillin',                                 45000,  120, N'Hộp', N'Kháng sinh nhóm penicilin',          NULL, 1, 1),
(N'Paracetamol 500mg',  N'Paracetamol',                                 15000,  300, N'Hộp', N'Giảm đau, hạ sốt',                 NULL, 2, 2),
(N'Panadol Extra',      N'Paracetamol + Cafein',                        35000,   80, N'Hộp', N'Giảm đau mạnh hơn',                NULL, 2, 3),
(N'Decolgen',           N'Paracetamol + Phenylephrine + Chlorpheniramine', 28000, 150, N'Hộp', N'Thuốc cảm cúm',                   NULL, 3, 1),
(N'Vitamin C 1000mg',   N'Acid ascorbic',                              120000,  200, N'Lọ',  N'Tăng sức đề kháng',                NULL, 4, 2),
(N'Máy đo huyết áp Omron', NULL,                                       850000,   15, N'Cái', N'Máy đo huyết áp điện tử',          NULL, 5, 3);
GO

INSERT INTO [InventoryBatch] (ProductId, LotNumber, Quantity, MfgDate, ExpDate, ImportPrice) VALUES
(1, 'LOT-AMX-2025-01',  120, '2025-01-15', '2027-01-15',  30000),
(2, 'LOT-PARA-2025-03', 300, '2025-03-01', '2027-03-01',   8000),
(3, 'LOT-PANA-2025-02',  80, '2025-02-10', '2026-12-31',  22000),
(4, 'LOT-DEC-2025-04',  150, '2025-04-01', '2027-04-01',  18000),
(5, 'LOT-VITC-2025-01', 200, '2025-01-20', '2026-07-20',  70000),
(6, 'LOT-OMR-2024-11',   15, '2024-11-01', '2029-11-01', 600000);
GO

PRINT N'============================================================';
PRINT N'Database MedCarePharmacyDB created successfully.';
PRINT N'Demo accounts (password = 123456):';
PRINT N'  admin@medcare.vn       → role: admin';
PRINT N'  pharmacist@medcare.vn  → role: pharmacist';
PRINT N'  customer@medcare.vn    → role: customer';
PRINT N'============================================================';
GO
