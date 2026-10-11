using MedCare_Pharmacy.Models.Data;
using MedCare_Pharmacy.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MedCare_Pharmacy.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public record LoginDto(string Email, string Password);
        public record RegisterDto(string FullName, string Phone, string Email, string Password);

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
            {
                return BadRequest(new { message = "Email hoặc mật khẩu không chính xác" });
            }

            // Kiểm tra mật khẩu (hỗ trợ cả Bcrypt hash và chuỗi thuần demo)
            bool isValidPassword = false;
            try
            {
                isValidPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            }
            catch
            {
                isValidPassword = (user.PasswordHash == dto.Password);
            }

            if (!isValidPassword)
            {
                return BadRequest(new { message = "Email hoặc mật khẩu không chính xác" });
            }

            if (user.Status == "Locked")
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị khóa" });
            }

            var token = GenerateJwtToken(user);
            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Phone,
                    role = user.Role.ToLower(), // Chuẩn hóa chữ thường cho Frontend
                    user.Status
                }
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(new { message = "Email đã được sử dụng" });
            }

            var user = new User
            {
                FullName = dto.FullName,
                Phone = dto.Phone,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "customer", // Đổi thành 'customer' viết thường
                Status = "Active"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công" });
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _config["Jwt:Key"]!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToLower())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

   

        // (Tùy chọn) POST API xử lý khôi phục mật khẩu ở Backend
        [HttpPost("api/auth/forgot-password")]
        public async Task<IActionResult> ForgotPasswordApi([FromBody] ForgotPasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.EmailOrPhone))
            {
                return BadRequest(new { message = "Vui lòng nhập thông tin tài khoản" });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.EmailOrPhone || u.Phone == dto.EmailOrPhone);

            if (user == null)
            {
                // Để bảo mật, thường vẫn trả về thành công giả lập để tránh lộ thông tin tài khoản tồn tại hay không
                return Ok(new { success = true, message = "Nếu tài khoản tồn tại, hướng dẫn đã được gửi." });
            }

            // TODO: Tạo token đặt lại mật khẩu và gửi email / SMS cho người dùng ở đây

            return Ok(new { success = true, message = "Đã gửi hướng dẫn khôi phục mật khẩu." });
        }

        [HttpPost("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng" });

            // Cập nhật thông tin vào cơ sở dữ liệu SQL Server
            user.FullName = dto.FullName;
            user.Phone = dto.Phone;

            await _context.SaveChangesAsync(); // Lưu thay đổi vào CSDL

            return Ok(new { success = true, message = "Cập nhật cơ sở dữ liệu thành công" });
        }

        // Bổ sung API đổi mật khẩu lưu vào Database
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng" });

            // Kiểm tra mật khẩu hiện tại bằng BCrypt
            bool isValidPassword = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
            if (!isValidPassword)
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không chính xác" });
            }

            // Mã hóa mật khẩu mới và lưu vào Database
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đổi mật khẩu thành công" });
        }

        public record UpdateProfileDto(string FullName, string Phone);
        public record ChangePasswordDto(string CurrentPassword, string NewPassword);
        public record ForgotPasswordDto(string EmailOrPhone);
    }
}