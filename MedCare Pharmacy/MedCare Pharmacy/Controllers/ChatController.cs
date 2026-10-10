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
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        private int? CurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }

        // GET: api/chat/conversations
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized();

            var messages = await _context.ChatMessages
                .Where(m => m.SenderId == me || m.ReceiverId == me)
                .OrderByDescending(m => m.Timestamp)
                .ToListAsync();

            var peerIds = messages
                .Select(m => m.SenderId == me ? m.ReceiverId : m.SenderId)
                .Distinct()
                .ToList();

            var peers = await _context.Users
                .Where(u => peerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var convs = peerIds.Select(pid =>
            {
                var last = messages.First(m =>
                    (m.SenderId == me && m.ReceiverId == pid) ||
                    (m.SenderId == pid && m.ReceiverId == me));

                var unread = messages.Count(m =>
                    m.SenderId == pid && m.ReceiverId == me && !m.IsRead);

                peers.TryGetValue(pid, out var peer);

                return new
                {
                    peerId = pid,
                    peerName = peer?.FullName ?? ("User #" + pid),
                    peerEmail = peer?.Email ?? "",
                    peerRole = peer?.Role?.ToLower() ?? "",
                    lastMessage = last.Content,
                    lastUpdate = last.Timestamp,
                    unread
                };
            })
            .OrderByDescending(c => c.lastUpdate)
            .ToList();

            return Ok(convs);
        }

        // GET: api/chat/messages?peerId=5
        [HttpGet("messages")]
        public async Task<IActionResult> GetMessages([FromQuery] int peerId)
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized();

            var msgs = await _context.ChatMessages
                .Where(m =>
                    (m.SenderId == me && m.ReceiverId == peerId) ||
                    (m.SenderId == peerId && m.ReceiverId == me))
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            var userIds = msgs.Select(m => m.SenderId).Distinct().ToList();
            var users = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var result = msgs.Select(m => new
            {
                id = m.Id,
                senderId = m.SenderId,
                receiverId = m.ReceiverId,
                text = m.Content,
                at = m.Timestamp,
                isRead = m.IsRead,
                senderName = users.ContainsKey(m.SenderId) ? users[m.SenderId].FullName : "",
                isMine = m.SenderId == me
            });

            return Ok(result);
        }

        // POST: api/chat/messages
        [HttpPost("messages")]
        public async Task<IActionResult> Send([FromBody] SendChatDto dto)
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized();

            if (dto == null || dto.ReceiverId <= 0 || string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Thiếu người nhận hoặc nội dung" });

            var receiver = await _context.Users.FindAsync(dto.ReceiverId);
            if (receiver == null)
                return BadRequest(new { message = "Không tìm thấy người nhận" });

            var msg = new ChatMessage
            {
                SenderId = me.Value,
                ReceiverId = dto.ReceiverId,
                Content = dto.Content.Trim(),
                Timestamp = DateTime.Now,
                IsRead = false
            };

            _context.ChatMessages.Add(msg);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                id = msg.Id,
                senderId = msg.SenderId,
                receiverId = msg.ReceiverId,
                text = msg.Content,
                at = msg.Timestamp
            });
        }

        // PUT: api/chat/messages/read?peerId=5
        [HttpPut("messages/read")]
        public async Task<IActionResult> MarkRead([FromQuery] int peerId)
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized();

            var unread = await _context.ChatMessages
                .Where(m => m.SenderId == peerId && m.ReceiverId == me && !m.IsRead)
                .ToListAsync();

            foreach (var m in unread) m.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, marked = unread.Count });
        }

        // GET: api/chat/unread
        [HttpGet("unread")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var me = CurrentUserId();
            if (me == null) return Unauthorized();

            var count = await _context.ChatMessages
                .CountAsync(m => m.ReceiverId == me && !m.IsRead);

            return Ok(new { count });
        }

        // GET: api/chat/pharmacists  (khách lấy dược sĩ để bắt đầu chat)
        [HttpGet("pharmacists")]
        public async Task<IActionResult> GetPharmacists()
        {
            var list = await _context.Users
                .Where(u => u.Role.ToLower() == "pharmacist" && u.Status.ToLower() == "active")
                .Select(u => new { u.Id, u.FullName, u.Email })
                .ToListAsync();
            return Ok(list);
        }
    }

    public record SendChatDto(int ReceiverId, string Content);
}