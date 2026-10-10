namespace MedCare_Pharmacy.Models.Entities
{
    public class Prescription
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = "image"; // image | pdf
        public DateTime UploadedAt { get; set; } = DateTime.Now;
    }
}