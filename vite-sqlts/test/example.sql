SELECT
    u.id,
    u.username,
    u.email,
    p.title as post_title,
    p.content as post_content,
    p.created_at
FROM users u
INNER JOIN posts p ON u.id = p.user_id
WHERE u.active = true
ORDER BY p.created_at DESC
LIMIT $1;
