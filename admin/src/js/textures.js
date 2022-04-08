m_site.textures = new CRUD({
    Model: Texture,
    page_all: "textures",
    page_item: "texture",
    api_path: "textures"
})

m_site.textures.uploadPicDone = function(err, result) {
    if(err) {
        return console.error(err)
    }

    m_site.textures.current_item().img(result.name)
}
