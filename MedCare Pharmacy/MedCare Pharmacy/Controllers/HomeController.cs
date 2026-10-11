using MedCare_Pharmacy.Models;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace MedCare_Pharmacy.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }
        public IActionResult ShippingPolicy()
        {
            ViewData["Title"] = "Chính sách giao hàng";
            return View();
        }

        public IActionResult BuyingGuide()
        {
            ViewData["Title"] = "Hướng dẫn mua hàng";
            return View();
        }

        public IActionResult ReturnPolicy()
        {
            ViewData["Title"] = "Chính sách đổi trả";
            return View();
        }
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
