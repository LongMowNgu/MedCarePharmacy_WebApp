using MedCare_Pharmacy.Models.Data;
using MedCare_Pharmacy.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedCare_Pharmacy.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PrescriptionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public PrescriptionsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private int? CurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }

        // GET: api/prescriptions
        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized(new { message = "Chưa đăng nhập" });

            var list = await _context.Prescriptions
                .Where(p => p.UserId == me)
                .OrderByDescending(p => p.UploadedAt)
                .Select(p => new
                {
                    p.Id,
                    p.FileName,
                    p.FileUrl,
                    p.FileType,
                    p.UploadedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // POST: api/prescriptions/upload  (multipart/form-data, field name = "file")
        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized(new { message = "Chưa đăng nhập" });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Chưa chọn file" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".png", ".jpg", ".jpeg", ".pdf" };
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Chỉ hỗ trợ PNG, JPG, JPEG, PDF" });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File tối đa 5MB" });

            var folder = Path.Combine(_env.WebRootPath, "uploads", "prescriptions");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var storedName = $"{me}_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            var physicalPath = Path.Combine(folder, storedName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/prescriptions/{storedName}";
            var fileType = ext == ".pdf" ? "pdf" : "image";

            var entity = new Prescription
            {
                UserId = me.Value,
                FileName = file.FileName,
                FileUrl = url,
                FileType = fileType,
                UploadedAt = DateTime.Now
            };

            _context.Prescriptions.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Đã tải lên đơn thuốc",
                prescription = new
                {
                    entity.Id,
                    entity.FileName,
                    entity.FileUrl,
                    entity.FileType,
                    entity.UploadedAt
                }
            });
        }

        // DELETE: api/prescriptions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized(new { message = "Chưa đăng nhập" });

            var item = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == me);

            if (item == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            // Xóa file vật lý nếu còn
            try
            {
                var physical = Path.Combine(_env.WebRootPath,
                    item.FileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(physical))
                    System.IO.File.Delete(physical);
            }
            catch { /* bỏ qua lỗi xóa file */ }

            _context.Prescriptions.Remove(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã xóa đơn thuốc" });
        }
    }
}