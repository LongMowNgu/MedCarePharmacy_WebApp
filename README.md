# MedCare Pharmacy

Ứng dụng web quản lý nhà thuốc được xây dựng bằng ASP.NET Core MVC và Web API. Hệ thống hỗ trợ quy trình bán thuốc, quản lý sản phẩm và tồn kho, xử lý đơn hàng, tiếp nhận đơn thuốc và trao đổi giữa khách hàng với dược sĩ.

## Tính năng

- **Khách hàng:** duyệt và xem chi tiết sản phẩm, quản lý giỏ hàng, đặt hàng, theo dõi đơn mua, gửi đơn thuốc và tư vấn với dược sĩ.
- **Quản trị:** quản lý tài khoản, danh mục, sản phẩm, nhà cung cấp, nhập kho và báo cáo.
- **Dược sĩ:** xử lý các nghiệp vụ chuyên môn, đơn thuốc và hội thoại tư vấn.
- **Kho và nhập hàng:** theo dõi lô hàng, phiếu nhập, biến động tồn kho và lịch sử nhập.
- **API:** các endpoint cho xác thực, sản phẩm, danh mục, đơn hàng, tồn kho, đơn thuốc, người dùng và chat; Swagger UI được bật trong môi trường Development.
- **Bảo mật:** xác thực API bằng JWT, cookie HttpOnly cho trang nhân viên, mã hóa mật khẩu bằng BCrypt và giới hạn tần suất cho xác thực.

## Công nghệ

- ASP.NET Core MVC / Web API, .NET 10
- Entity Framework Core 10
- Microsoft SQL Server
- JWT Bearer, cookie authentication
- Swagger / OpenAPI
- HTML, CSS, JavaScript và Razor Views

## Cấu trúc thư mục

```text
.
├── MedCare Pharmacy/
│   ├── MedCare Pharmacy.slnx
│   └── MedCare Pharmacy/
│       ├── Controllers/       # MVC controllers và API
│       ├── Models/            # DbContext, entities, view models
│       ├── Views/             # Razor views
│       ├── wwwroot/           # CSS, JavaScript, hình ảnh và tài nguyên tĩnh
│       ├── appsettings.json   # Cấu hình ứng dụng
│       └── MedCare Pharmacy.csproj
├── MedCarePharmacy_Complete.sql
└── README.md
```

## Yêu cầu

- .NET SDK 10.0
- SQL Server (LocalDB hoặc SQL Server instance)
- SQL Server Management Studio (SSMS) để khởi tạo cơ sở dữ liệu thuận tiện

## Cài đặt và chạy

1. Sao chép repository và chuyển vào thư mục ứng dụng:

   ```bash
   git clone https://github.com/LongMowNgu/MedCarePharmacy_WebApp.git
   cd MedCarePharmacy_WebApp
   cd "MedCare Pharmacy/MedCare Pharmacy"
   ```

2. Tạo cơ sở dữ liệu bằng SQL Server Management Studio. Từ thư mục repository, mở `MedCarePharmacy_Complete.sql` và làm theo phần hướng dẫn ở đầu file. Chạy toàn bộ script để tạo cơ sở dữ liệu demo mới. Nếu cơ sở dữ liệu đã có dữ liệu cần giữ, chỉ chạy phần **EXISTING DATABASE UPGRADE SECTION** theo hướng dẫn trong script. Phần cài đặt mới có thể nạp lại dữ liệu mẫu, vì vậy không chạy toàn bộ trên cơ sở dữ liệu đang sử dụng.

3. Cấu hình chuỗi kết nối `ConnectionStrings:DefaultConnection` trong `appsettings.json` hoặc cấu hình qua User Secrets/biến môi trường cho SQL Server trên máy của bạn. Ví dụ biến môi trường:

   ```powershell
   $env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=MedCarePharmacyDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
   ```

4. Chạy ứng dụng:

   ```bash
   dotnet restore
   dotnet run
   ```

   Mở URL HTTPS/HTTP được in trong terminal. Khi chạy ở môi trường Development, Swagger UI có tại `/swagger`.

> Ứng dụng tự tạo khóa ký JWT cục bộ nếu chưa được cung cấp. Nếu cấu hình `Jwt:Key` thủ công, khóa cần có tối thiểu 32 byte. Không commit khóa bí mật hoặc thông tin kết nối chứa mật khẩu lên Git.

## Ghi chú cấu hình

- CORS hiện cho phép frontend tại `http://localhost:5500`, `http://127.0.0.1:5500` và `http://localhost:3000`. Cập nhật policy `AllowFrontend` trong `Program.cs` nếu frontend dùng origin khác.
- Tệp SQL chứa schema và dữ liệu mẫu của `MedCarePharmacyDB`; đọc kỹ hướng dẫn trong tệp trước khi chạy trên database hiện có.
- Tài khoản hoặc dữ liệu demo (nếu có) được mô tả trong SQL seed data. Hãy đổi thông tin đăng nhập mẫu trước khi triển khai thật.

## Đóng góp và vấn đề

Mở issue trong repository để báo lỗi hoặc đề xuất cải tiến. Khi gửi thay đổi, vui lòng mô tả mục đích và các bước kiểm tra đã thực hiện.

## Giấy phép

Chưa khai báo giấy phép sử dụng. Vui lòng liên hệ chủ sở hữu repository trước khi tái sử dụng hoặc phân phối mã nguồn.

