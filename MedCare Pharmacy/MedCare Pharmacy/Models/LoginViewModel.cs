using System.ComponentModel.DataAnnotations;

namespace MedCare_Pharmacy.Models
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "Email hoặc số điện thoại không được để trống")]
        [Display(Name = "Email / Số điện thoại")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự")]
        [DataType(DataType.Password)]
        [Display(Name = "Mật khẩu")]
        public string Password { get; set; } = string.Empty;

        [Display(Name = "Ghi nhớ đăng nhập")]
        public bool RememberMe { get; set; }
    }
}
