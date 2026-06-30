pub const TITLE_SHORT_MAX: usize = 50;
pub const TITLE_LONG_MAX: usize = 100;
pub const DESCRIPTION_MAX: usize = 800;

pub struct ParsedTitle {
    pub short_title: String,
    pub long_titulo: Option<String>,
}

pub fn parse_required_title(input: &str, empty_message: &str) -> Result<ParsedTitle, String> {
    let text = input.trim();
    if text.is_empty() {
        return Err(empty_message.to_string());
    }
    parse_title_text(text)
}

pub fn parse_optional_title(
    input: Option<String>,
) -> Result<(Option<String>, Option<String>), String> {
    let Some(raw) = input else {
        return Ok((None, None));
    };
    let text = raw.trim();
    if text.is_empty() {
        return Ok((None, None));
    }
    let parsed = parse_title_text(text)?;
    Ok((Some(parsed.short_title), parsed.long_titulo))
}

fn parse_title_text(text: &str) -> Result<ParsedTitle, String> {
    let char_count = text.chars().count();
    if char_count > TITLE_LONG_MAX {
        return Err(format!(
            "O título deve ter no máximo {TITLE_LONG_MAX} caracteres."
        ));
    }
    if char_count <= TITLE_SHORT_MAX {
        return Ok(ParsedTitle {
            short_title: text.to_string(),
            long_titulo: None,
        });
    }
    let short_title: String = text.chars().take(TITLE_SHORT_MAX).collect();
    Ok(ParsedTitle {
        short_title,
        long_titulo: Some(text.to_string()),
    })
}

pub fn parse_description(input: Option<String>) -> Result<Option<String>, String> {
    let Some(raw) = input else {
        return Ok(None);
    };
    let text = raw.trim();
    if text.is_empty() {
        return Ok(None);
    }
    if text.chars().count() > DESCRIPTION_MAX {
        return Err(format!(
            "A descrição deve ter no máximo {DESCRIPTION_MAX} caracteres."
        ));
    }
    Ok(Some(text.to_string()))
}
